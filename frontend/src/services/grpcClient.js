import { grpc } from '@improbable-eng/grpc-web';
import { TradingServiceClient, RiskServiceClient } from '../proto/protos/trading_api_grpc_web_pb';
import { 
  Tick,
  PortfolioRequest,
  PortfolioResponse,
  StrategyRequest,
  OrderBookRequest,
  VaRRequest,
  VaRResponse,
} from '../proto/protos/trading_api_pb';

const host = 'http://localhost:8080'; // Route all requests through envoy proxy
const options = {
  transport: grpc.CrossBrowserHttpTransport({
    withCredentials: false,
    allowedRequestMedia: ['application/grpc-web+proto'],
  }),
  debug: true,
  keepalive: {
    time: 15000,     // Send keepalive ping every 15 seconds
    timeout: 10000,  // Consider connection dead after 10 seconds of no response
  }
};

const tradingClient = new TradingServiceClient(host, null, options);
const riskClient = new RiskServiceClient(host, null, options);

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT = 60000; // 60 seconds
const BACKOFF_FACTOR = 1.5; // Exponential backoff factor

const createMetadata = () => ({
  'Content-Type': 'application/grpc-web+proto',
  'Accept': 'application/grpc-web+proto',
  'X-Grpc-Web': '1',
  'X-User-Agent': 'grpc-web-javascript/0.1'
});

const withRetry = async (operation, operationName = 'Operation', retries = MAX_RETRIES) => {
  let currentDelay = RETRY_DELAY;
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`${operationName}: Attempt ${i + 1}/${retries}`);
      const result = await Promise.race([
        operation(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`${operationName} timeout after ${TIMEOUT}ms`)), TIMEOUT)
        )
      ]);
      console.log(`${operationName}: Success`);
      return result;
    } catch (err) {
      console.error(`${operationName} failed:`, err);
      
      // Check for specific error conditions
      if (err.code === 0) {
        console.error(`${operationName}: Server unavailable or network error`);
      } else if (err.code >= 400 && err.code < 500) {
        console.error(`${operationName}: Client error (${err.code})`);
        throw err; // Don't retry client errors
      } else if (err.code >= 500) {
        console.error(`${operationName}: Server error (${err.code})`);
      }
      
      if (i === retries - 1) {
        console.error(`${operationName}: Failed after ${retries} attempts`);
        throw err;
      }
      
      console.log(`${operationName}: Retrying in ${currentDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      currentDelay = Math.min(currentDelay * BACKOFF_FACTOR, TIMEOUT); // Exponential backoff
    }
  }
};

export const streamOrderBook = (symbol, onData, onError) => {
  console.log('Starting OrderBook stream for symbol:', symbol);
  let retryCount = 0;
  let stream = null;
  
  const setupStream = () => {
    try {
      const request = new OrderBookRequest();
      request.setSymbol(symbol);
      console.log('OrderBook Request:', request.toObject());

      console.log('Setting up new OrderBook stream with metadata:', createMetadata());
      stream = tradingClient.streamOrderBook(request, createMetadata());

      stream.on('data', (response) => {
        try {
          console.log('Received OrderBook data');
          const data = response.toObject();
          console.log('Parsed OrderBook data:', data);
          onData({
            bids: data.bidsList.map(bid => ({
              price: bid.price,
              size: bid.size
            })) || [],
            asks: data.asksList.map(ask => ({
              price: ask.price,
              size: ask.size
            })) || []
          });
          retryCount = 0; // Reset retry count on successful data
          console.log('Successfully processed OrderBook data');
        } catch (err) {
          console.error('Error parsing OrderBook data:', err);
          onError(`Error parsing data: ${err.message}`);
        }
      });

      stream.on('error', (err) => {
        console.error('OrderBook stream error:', err);
        onError(`Stream error: ${err.message}`);
        
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = RETRY_DELAY * Math.pow(BACKOFF_FACTOR, retryCount - 1);
          console.log(`Reconnecting OrderBook stream in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})...`);
          setTimeout(setupStream, delay);
        } else {
          console.error('Max retry attempts reached for OrderBook stream');
          onError('Failed to maintain connection after maximum retry attempts');
        }
      });

      return () => {
        console.log('Cleaning up OrderBook stream');
        if (stream) {
          stream.cancel();
          stream = null;
        }
      };
    } catch (err) {
      console.error('Error setting up OrderBook stream:', err);
      onError(`Failed to setup stream: ${err.message}`);
      return () => {}; // Return no-op cleanup function
    }
  };

  return setupStream();
};

export const fetchRiskMetrics = async () => {
  console.log('Fetching risk metrics');
  return withRetry(async () => {
    const request = new VaRRequest();
    
    // Create a portfolio response for the current portfolio
    const portfolio = new PortfolioResponse();
    const positionsMap = portfolio.getPositionsMap();
    positionsMap.set('BTC-USD', 0.5);
    portfolio.setTotalValueUsd(100000);
    
    request.setCurrentPortfolio(portfolio);
    request.setRiskModel('monte_carlo');

    return new Promise((resolve, reject) => {
      riskClient.calculateVaR(request, createMetadata(), (err, response) => {
        if (err) {
          console.error('Error fetching risk metrics:', err);
          reject(err);
          return;
        }
        resolve(response.toObject());
      });
    });
  }, 'Fetch Risk Metrics');
};

export const startStrategy = async (params) => {
  console.log('Starting strategy with params:', params);
  return withRetry(async () => {
    const request = new StrategyRequest();
    request.setStrategyId('mean_reversion');
    request.setSymbol('BTC-USD');
  
    // Convert parameters to strings for the map
    const paramMap = {};
    paramMap['type'] = 'MEAN_REVERSION';
    paramMap['lookback_period'] = params.lookbackPeriod.toString();
    paramMap['entry_std_dev'] = params.entryStdDev.toString();
    paramMap['exit_std_dev'] = params.exitStdDev.toString();
    paramMap['max_position_size'] = params.maxPositionSize.toString();
    paramMap['stop_loss_percent'] = params.stopLossPercent.toString();
    paramMap['risk_per_trade_percent'] = params.riskPerTradePercent.toString();
    paramMap['period'] = '5'; // Update interval in seconds
    paramMap['threshold'] = params.entryStdDev.toString();
  
    request.setParametersMap(paramMap);

    return new Promise((resolve, reject) => {
      tradingClient.startStrategy(request, createMetadata(), (err, response) => {
        if (err) {
          console.error('Error starting strategy:', err);
          reject(err);
          return;
        }
        resolve(response.toObject());
      });
    });
  }, 'Start Strategy');
};

export const fetchPrice = async (symbol) => {
  console.log('Fetching price for symbol:', symbol);
  return withRetry(async () => {
    const request = new Tick();
    request.setSymbol(symbol);

    return new Promise((resolve, reject) => {
      tradingClient.getPrice(request, createMetadata(), (err, response) => {
        if (err) {
          console.error('Error fetching price:', err);
          reject(err);
          return;
        }
        resolve(response.toObject());
      });
    });
  }, 'Fetch Price');
};