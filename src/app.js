const express = require('express');
const logger = require('./logger');
const { register, metricsMiddleware, itemsProcessed } = require('./metrics');
 
const app = express();
const PORT = process.env.PORT || 3000;
 
app.use(express.json());
app.use(metricsMiddleware);
 
// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP Request', {
      method: req.method, path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - start + 'ms',
      ip: req.ip
    });
  });
  next();
});
 
// Home
app.get('/', (req, res) => {
  logger.info('Home page accessed');
  res.json({
    status: 'success',
    message: 'Welcome to Node.js EKS App!',
    version: process.env.APP_VERSION || '1.0.0',
    timestamp: new Date().toISOString()
  });
});
 
// Health check (Kubernetes liveness probe)
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});
 
// Readiness check (Kubernetes readiness probe)
app.get('/ready', (req, res) => {
  res.json({ status: 'ready' });
});
 
// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    logger.error('Metrics error', { error: err.message });
    res.status(500).end(err.message);
  }
});
 
// API routes
app.get('/api/items', (req, res) => {
  const items = [
    { id: 1, name: 'Alpha', status: 'active' },
    { id: 2, name: 'Beta', status: 'active' },
    { id: 3, name: 'Gamma', status: 'inactive' }
  ];
  itemsProcessed.inc({ type: 'read' });
  logger.info('Items fetched', { count: items.length });
  res.json({ status: 'success', data: items });
});
 
app.post('/api/items', (req, res) => {
  const { name } = req.body;
  if (!name) {
    logger.warn('Missing name field');
    return res.status(400).json({ status: 'error', message: 'Name required' });
  }
  itemsProcessed.inc({ type: 'create' });
  logger.info('Item created', { name });
  res.status(201).json({
    status: 'success',
    data: { id: Date.now(), name, status: 'active' }
  });
});
 
// Error test endpoint (for monitoring verification)
app.get('/api/error-test', (req, res) => {
  if (Math.random() > 0.5) {
    logger.error('Simulated error triggered!');
    return res.status(500).json({ status: 'error', message: 'Server error' });
  }
  res.json({ status: 'success', message: 'No error this time' });
});
 
// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { path: req.path });
  res.status(404).json({ status: 'error', message: 'Route not found' });
});
 
// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ status: 'error', message: 'Internal server error' });
});
 
app.listen(PORT, '0.0.0.0', () => {
  logger.info('Server started on port ' + PORT);
});
 
module.exports = app;

