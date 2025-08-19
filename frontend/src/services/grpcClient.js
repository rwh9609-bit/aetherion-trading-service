import { grpc } from '@improbable-eng/grpc-web';
import { TradingServiceClient, RiskServiceClient, AuthServiceClient } from '../proto/trading_api_grpc_web_pb.js';
import { BotServiceClient } from '../proto/bot_grpc_web_pb.js';
import { 
  OrderBookRequest,
  StrategyRequest,
  Tick,
  Portfolio,
  VaRRequest,
  RegisterRequest,
  AuthRequest,
  TickStreamRequest,
  SymbolRequest
} from '../proto/trading_api_pb.js'; // explicit extension already present

// Determine gRPC-web host.
// Priority: explicit env var -> same-origin (production) -> localhost dev fallback.
// Set REACT_APP_GRPC_HOST in production (e.g. https://app.aetherion.cloud or https://api.aetherion.cloud).
let resolvedHost = process.env.REACT_APP_GRPC_HOST;
if (!resolvedHost && typeof window !== 'undefined') {
  const loc = window.location;
  // Dev localhost
  if (loc.hostname === 'localhost' || /127\.0\.0\.1/.test(loc.hostname)) {
    resolvedHost = 'http://localhost:8080';
  } else if (/^app\./.test(loc.hostname)) {
    // Split-domain mode: auto-map app.<root> -> api.<root> when no explicit REACT_APP_GRPC_HOST provided.
    const rootDomain = loc.hostname.replace(/^app\./, '');
    resolvedHost = `https://api.${rootDomain}:443`;
    console.log('Auto-detected split-domain API host:', resolvedHost);
  } else {
    // Same-origin fallback (single domain deployment)
    resolvedHost = `${loc.protocol}//${loc.host}`;
  }
}
const host = resolvedHost || 'https://api.aetherion.cloud:443'; // final fallback for production
console.log('gRPC host resolved to:', host);
const options = {
  transport: grpc.CrossBrowserHttpTransport({
    withCredentials: false,
  }),
  debug: true
};

const tradingClient = new TradingServiceClient(host, null, {...options, format: 'text'});
const riskClient = new RiskServiceClient(host, null, {...options, format: 'text'});
const botClient = new BotServiceClient(host, null, {...options, format: 'text'});
const authClient = new AuthServiceClient(host, null, {...options, format: 'text'});

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds
const TIMEOUT = 60000; // 60 seconds
const BACKOFF_FACTOR = 1.5; // Exponential backoff factor

let authToken = localStorage.getItem('authToken'); // Persisted JWT

export const setAuthToken = (token) => { 
  authToken = token; 
  if (token) localStorage.setItem('authToken', token); else localStorage.removeItem('authToken');
};

const createMetadata = () => {
  const meta = {
    'X-Grpc-Web': '1',
    'Content-Type': 'application/grpc-web+proto',
  };
  if (authToken) {
    meta['authorization'] = `Bearer ${authToken}`;
  }
  return meta;
};

// Auth helper calls
export const registerUser = async (username, password) => {
  return new Promise((resolve, reject) => {
    const req = new RegisterRequest();
    req.setUsername(username);
    req.setPassword(password);
    authClient.register(req, createMetadata(), (err, resp) => {
      if (err) return resolve({ success:false, message: err.message });
      const obj = resp.toObject();
      return resolve(obj);
    });
  });
};

export const loginUser = async (username, password) => {
  return new Promise((resolve, reject) => {
    const req = new AuthRequest();
    req.setUsername(username);
    req.setPassword(password);
    authClient.login(req, createMetadata(), (err, resp) => {
      if (err) return resolve({ success:false, message: err.message });
      const obj = resp.toObject();
      if (obj.success && obj.token) setAuthToken(obj.token);
      resolve(obj);
    });
  });
};

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
  const delaySnapshot = currentDelay; // capture to avoid closure on mutated var
  await new Promise(resolve => setTimeout(resolve, delaySnapshot));
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
              size: bid.size,
              timestamp: bid.timestamp
            })) || [],
            asks: data.asksList.map(ask => ({
              price: ask.price,
              size: ask.size,
              timestamp: ask.timestamp
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
    
    // Create a portfolio for the current portfolio
    const portfolio = new Portfolio();
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
    request.setUserId('currentUserId'); // Replace with actual user ID from context or state
  
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
  
    const map = request.getParametersMap();
    Object.entries(paramMap || {}).forEach(([k, v]) => map.set(k, String(v)));

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

export const addSymbol = async (symbol) => {
  return new Promise((resolve, reject) => {
    const req = new SymbolRequest();
    req.setSymbol(symbol);
    tradingClient.addSymbol(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

export const removeSymbol = async (symbol) => {
  return new Promise((resolve, reject) => {
    const req = new SymbolRequest();
    req.setSymbol(symbol);
    tradingClient.removeSymbol(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

export const listSymbols = async () => {
  const { Empty } = await import('../proto/trading_api_pb.js');
  const req = new Empty();
  return new Promise((resolve, reject) => {
    tradingClient.listSymbols(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

// Fetch server-side momentum metrics (optional symbol filter array)
export const getMomentum = async (symbols=[]) => {
  const { MomentumRequest } = await import('../proto/trading_api_pb.js');
  const req = new MomentumRequest();
  req.setSymbolsList(symbols);
  return new Promise((resolve, reject) => {
    tradingClient.getMomentum(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

// Stream live price ticks (server-streaming gRPC). Returns a cleanup function to cancel.
export const streamPrice = (symbol, onData, onError) => {
  console.log('Starting Price stream for symbol:', symbol);
  let stream;
  try {
    const request = new TickStreamRequest();
    request.setSymbol(symbol);
    stream = tradingClient.streamPrice(request, createMetadata());

    stream.on('data', (resp) => {
      try {
        const tick = resp.toObject();
        // tick: { symbol, price, timestamp }
        onData(tick);
      } catch (e) {
        console.error('Error handling price tick:', e);
        onError && onError(e.message || 'Tick parse error');
      }
    });
    stream.on('error', (err) => {
      console.error('Price stream error:', err);
      onError && onError(err.message || 'Stream error');
    });
    stream.on('end', () => {
      console.log('Price stream ended');
    });
  } catch (e) {
    console.error('Failed to start price stream:', e);
    onError && onError(e.message || 'Stream start failure');
  }
  return () => {
    if (stream) {
      console.log('Cancelling price stream for symbol:', symbol);
      stream.cancel();
      stream = null;
    }
  };
};

// --- Bot Service Helpers ---
export const createBot = async ({ name, symbol, strategy, parameters }) => {
  const { CreateBotRequest } = await import('../proto/bot_pb.js');
  return new Promise((resolve, reject) => {
    const req = new CreateBotRequest();
    req.setName(name); req.setSymbol(symbol); req.setStrategy(strategy);
    const map = req.getParametersMap();
    Object.entries(parameters || {}).forEach(([k,v]) => map.set(k, String(v)));
    botClient.createBot(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

export const listBots = async () => {
  const { Empty } = await import('../proto/trading_api_pb.js');
  const req = new Empty();
  return new Promise((resolve, reject) => {
    botClient.listBots(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

export const startBot = async (id) => {
  const { BotIdRequest } = await import('../proto/bot_pb.js');
  const req = new BotIdRequest(); req.setId(id);
  return new Promise((resolve, reject) => {
    botClient.startBot(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

export const stopBot = async (id) => {
  const { BotIdRequest } = await import('../proto/bot_pb.js');
  const req = new BotIdRequest(); req.setId(id);
  return new Promise((resolve, reject) => {
    botClient.stopBot(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

export const getBotStatus = async (id) => {
  const { BotIdRequest } = await import('../proto/bot_pb.js');
  const req = new BotIdRequest(); req.setId(id);
  return new Promise((resolve, reject) => {
    botClient.getBotStatus(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};