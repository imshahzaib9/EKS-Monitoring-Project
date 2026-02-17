const client = require('prom-client');
const register = new client.Registry();
 
// Default Node.js metrics (heap, CPU, event loop lag, GC)
client.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
  labels: { app: 'nodejs-eks-app' }
});
 
// HTTP request duration histogram
const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});
register.registerMetric(httpDuration);
 
// HTTP request counter
const httpTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpTotal);
 
// Active connections gauge
const activeConns = new client.Gauge({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections'
});
register.registerMetric(activeConns);
 
// Business metric
const itemsProcessed = new client.Counter({
  name: 'business_items_processed_total',
  help: 'Total business items processed',
  labelNames: ['type']
});
register.registerMetric(itemsProcessed);
 
function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();
  activeConns.inc();
  const end = httpDuration.startTimer();
  res.on('finish', () => {
    const route = req.route ? req.route.path : req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    end(labels);
    httpTotal.inc(labels);
    activeConns.dec();
  });
  next();
}
 
module.exports = { register, metricsMiddleware, itemsProcessed };

