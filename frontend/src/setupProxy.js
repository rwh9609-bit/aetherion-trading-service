const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy all gRPC-web requests to the Go service
  // NOTE: gRPC-web traffic goes through Envoy at :8080, while health endpoint lives on :8090
  app.use(
    '/trading.TradingService',
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        '^/trading.TradingService': '', // Remove the service prefix
      },
      onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('Content-Type', 'application/grpc-web+proto');
        proxyReq.setHeader('X-Grpc-Web', '1');
      },
      onProxyRes: (proxyRes, req, res) => {
        // Set CORS headers
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Grpc-Web, X-User-Agent';
        proxyRes.headers['Access-Control-Max-Age'] = '86400';
      },
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
