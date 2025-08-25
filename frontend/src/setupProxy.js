const { createProxyMiddleware } = require('http-proxy-middleware');

function grpcProxy(serviceName) {
  return createProxyMiddleware({
    target: 'http://localhost:8080',
    changeOrigin: true,
    ws: true,
    pathRewrite: {
      [`^/${serviceName}`]: '', // Remove the service prefix
    },
    onProxyReq: (proxyReq, req, res) => {
      proxyReq.setHeader('Content-Type', 'application/grpc-web+proto');
      proxyReq.setHeader('X-Grpc-Web', '1');
    },
    onProxyRes: (proxyRes, req, res) => {
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Grpc-Web, X-User-Agent';
      proxyRes.headers['Access-Control-Max-Age'] = '86400';
    },
  });
}


module.exports = function(app) {
  // Proxy all gRPC-web services
  [
    'trading.TradingService',
    'trading.PortfolioService',
    'trading.OrderService',
    'trading.BotService',
    'trading.RiskService',
    'trading.AuthService'
  ].forEach(service => {
    app.use(`/${service}`, grpcProxy(service));
  });

  // Proxy REST API to backend on port 8081
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8081',
      changeOrigin: true,
      pathRewrite: { '^/api': '/api' },
    })
  );

  // Health endpoint proxy (avoids CRA package.json global proxy hitting raw gRPC port)
  app.use(
    '/healthz',
    createProxyMiddleware({
      target: 'http://localhost:8090',
      changeOrigin: true,
      pathRewrite: { '^/healthz': '/healthz' },
    })
  );
};
