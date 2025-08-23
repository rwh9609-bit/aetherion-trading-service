import { grpc } from '@improbable-eng/grpc-web';
import { 
  OrderServiceClient,
  RiskServiceClient,
  AuthServiceClient,
  BotServiceClient,
  PortfolioServiceClient
} from '../proto/trading_api_grpc_web_pb.js';
import {
  Timestamp
} from 'google-protobuf/google/protobuf/timestamp_pb.js';
import { jwtDecode } from 'jwt-decode';
import {
  GetUserRequest,
  PortfolioResponse,
  PortfolioPosition,
  DecimalValue,
  VaRRequest,
  CreateBotRequest,
  RegisterRequest,
  AuthRequest,
  BotIdRequest,
  ListBotsRequest,
  Empty
} from '../proto/trading_api_pb.js';


// Determine gRPC-web host.
// Priority: explicit env var -> same-origin (production) -> localhost dev fallback.
// Set REACT_APP_GRPC_HOST in production (e.g. https://app.aetherion.cloud or https://api.aetherion.cloud).
let resolvedHost = process.env.REACT_APP_GRPC_HOST;
console.log('Resolved gRPC host:', resolvedHost);
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

const orderClient = new OrderServiceClient(host, null, {...options, format: 'text'});
export { orderClient };
const riskClient = new RiskServiceClient(host, null, {...options, format: 'text'});
export { riskClient };
const botClient = new BotServiceClient(host, null, {...options, format: 'text'});
export { botClient };
const authClient = new AuthServiceClient(host, null, {...options, format: 'text'});
export { authClient };
const portfolioClient = new PortfolioServiceClient(host, null, {...options, format: 'text'});
export { portfolioClient };

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
export { createMetadata };

// Auth helper calls
export const registerUser = async (username, email, password) => {
  return new Promise((resolve, reject) => {
    const req = new RegisterRequest();
    req.setUsername(username);
    req.setEmail(email);
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

export const getUser = async () => {
  const token = localStorage.getItem('authToken');
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    if (decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem('authToken');
      return null;
    }

    const req = new GetUserRequest();
    req.setUserId(decoded.sub); // Assumes user ID is in the 'sub' claim of the JWT

    return new Promise((resolve, reject) => {
      authClient.getUser(req, createMetadata(), (err, resp) => {
        if (err) {
          if (err.code === 5 || err.code === 16) { // NOT_FOUND or UNAUTHENTICATED
            localStorage.removeItem('authToken');
          }
          return reject(err);
        }
        resolve(resp.toObject());
      });
    });
  } catch (e) {
    console.error("Failed to decode or validate token", e);
    localStorage.removeItem('authToken');
    return null;
  }
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

export const fetchRiskMetrics = async () => {
  console.log('Fetching risk metrics');
  return withRetry(async () => {
    const request = new VaRRequest();

    // Build PortfolioResponse for current portfolio
    const portfolio = new PortfolioResponse();
    portfolio.setBotId("123");
    portfolio.setTotalPortfolioValue(new DecimalValue());
    portfolio.getTotalPortfolioValue().setUnits(50000);
    portfolio.getTotalPortfolioValue().setNanos(0);
    portfolio.setCashBalance(new DecimalValue());
    portfolio.getCashBalance().setUnits(0);
    portfolio.getCashBalance().setNanos(0);

    // Add a position
    const position = new PortfolioPosition();
    position.setSymbol("BTCUSD");
    position.setQuantity(new DecimalValue());
    position.getQuantity().setUnits(1);
    position.getQuantity().setNanos(0);
    position.setAveragePrice(new DecimalValue());
    position.getAveragePrice().setUnits(50000);
    position.getAveragePrice().setNanos(0);
    position.setMarketValue(new DecimalValue());
    position.getMarketValue().setUnits(50000);
    position.getMarketValue().setNanos(0);
    position.setUnrealizedPnl(new DecimalValue());
    position.getUnrealizedPnl().setUnits(0);
    position.getUnrealizedPnl().setNanos(0);
    position.setExposurePct(new DecimalValue());
    position.getExposurePct().setUnits(100);
    position.getExposurePct().setNanos(0);

    portfolio.setPositionsList([position]);
    const timestamp = new Timestamp();
    timestamp.setSeconds(Math.floor(Date.now() / 1000));
    portfolio.setUpdatedAt(timestamp);

    request.setCurrentPortfolio(portfolio);
    request.setRiskModel('historical');
    request.setConfidenceLevel(0.95);
    request.setHorizonDays(1);

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

export const handleGrpcError = (err, setUser, setView) => {
  // gRPC Unauthenticated error code is 16
  if (err && (err.code === 16 || err.message?.toLowerCase().includes('unauthenticated') || err.message?.toLowerCase().includes('invalid token'))) {
    localStorage.removeItem('authToken');
    if (setUser) setUser(null);
    if (setView) setView('login'); // or 'landing'
    return true; // handled
  }
  return false; // not handled
};

// --- Bot Service Helpers ---
export const createBot = async ({
  user_id,
  name,
  description,
  symbols,
  strategy_name,
  strategy_parameters,
  initial_account_value,
  is_live
}) => {
  // Use generated CreateBotRequest
  const req = new CreateBotRequest();
  req.setUserId(user_id);
  req.setName(name);
  req.setDescription(description);
  req.setSymbolsList(symbols);
  req.setStrategyName(strategy_name);

  // Set strategy_parameters as a map
  const paramsMap = req.getStrategyParametersMap();
  Object.entries(strategy_parameters || {}).forEach(([key, value]) => {
    paramsMap.set(key, value);
  });

  // Set initial_account_value as DecimalValue
  const dec = new DecimalValue();
  dec.setUnits(initial_account_value);
  dec.setNanos(0);
  req.setInitialAccountValue(dec);

  req.setIsLive(is_live);

  return new Promise((resolve, reject) => {
    botClient.createBot(req, createMetadata(), (err, resp) => {
      if (err) {
        console.error('[grpcClient] createBot error:', err);
        return reject(err);
      }
      resolve(resp.toObject());
    });
  });
};

export const listBots = async (userId) => {
  const { ListBotsRequest, Empty } = await import('../proto/trading_api_pb.js');
  const req = new ListBotsRequest();
  req.setUserId(userId); // userId now passed as argument
  return new Promise((resolve, reject) => {
    botClient.listBots(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

export const startBot = async (id) => {
  const { BotIdRequest } = await import('../proto/trading_api_pb.js'); // Corrected import
  const req = new BotIdRequest(); req.setBotId(id); // Corrected setter
  return new Promise((resolve, reject) => {
    botClient.startBot(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

export const stopBot = async (id) => {
  const { BotIdRequest } = await import('../proto/trading_api_pb.js'); // Corrected import
  const req = new BotIdRequest(); req.setBotId(id); // Corrected setter
  return new Promise((resolve, reject) => {
    botClient.stopBot(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

export const getBotStatus = async (id) => {
  const { BotIdRequest } = await import('../proto/trading_api_pb.js'); // Corrected import
  const req = new BotIdRequest(); req.setBotId(id); // Corrected setter
  return new Promise((resolve, reject) => {
    botClient.getBotStatus(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};

export const deleteBot = async (id) => {
  const { BotIdRequest } = await import('../proto/trading_api_pb.js');
  const req = new BotIdRequest();
  req.setBotId(id);
  return new Promise((resolve, reject) => {
    botClient.deleteBot(req, createMetadata(), (err, resp) => {
      if (err) return reject(err);
      resolve(resp.toObject());
    });
  });
};