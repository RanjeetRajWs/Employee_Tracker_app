/**
 * Server Entry Point
 * Main application server configuration and startup
 * @module server
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const initDB = require('./init-db');
const { config, validateConfig } = require('./src/config');
const logger = require('./src/config/logger');
const errorHandler = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const path = require('path');

// Validate configuration
validateConfig();

// Initialize Express app 
const app = express();

// Connect to Database
initDB();

// Security Middleware
app.use(helmet()); // Set security headers

// CORS
app.use(cors());

// Body Parser (increased limit for session uploads with screenshots)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Apply rate limiting to all routes
// app.use(apiLimiter);
app.use('/uploads', (req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(path.join(__dirname, 'uploads')));
// Health check endpoint
app.get('/health', async (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Test route
app.get('/', (req, res) => {
  res.json({
    message: 'Admin Backend API',
    version: '1.0.0',
    status: 'running',
  });
});

// API Routes
app.use('/admin', require('./src/routes/admin'));
app.use('/api/leaves', require('./src/routes/leaveRoutes'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error Handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
const http = require('http');
const server = http.createServer(app);
const { initSocketServer } = require('./src/sockets/socketManager');

// Initialize Sockets
initSocketServer(server);

server.listen(PORT, () => {
  logger.info(`🚀 Admin Backend running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.nodeEnv}`);
  logger.info(`🔒 Security headers enabled`);
  logger.info(`📊 Request logging enabled`);
  console.log(`\n✅ Server ready at http://localhost:${PORT}`);
  console.log(`✅ Health check at http://localhost:${PORT}/health\n`);

  // Start scheduled tasks (cleanup, compression, etc.)
  try {
    const scheduledTasks = require('./src/utils/scheduledTasks');
    scheduledTasks.startAll();
    logger.info('⏰ Scheduled tasks started');
  } catch (error) {
    logger.warn('⚠️ Scheduled tasks not started:', error.message);
  }
});
