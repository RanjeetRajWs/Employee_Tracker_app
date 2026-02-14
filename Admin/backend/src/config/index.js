/**
 * Application Configuration
 * @module config
 */

require('dotenv').config();

/**
 * Application configuration object
 */
const config = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/employee-tracker',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'supersecret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // CORS
  corsOrigin: [process.env.CORS_ORIGIN || 'http://localhost:5174', process.env.CORS_ORIGIN2 || 'http://localhost:5173'],

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100, // requests per window

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: process.env.LOG_DIR || './logs',
};

/**
 * Validate required environment variables
 */
const validateConfig = () => {
  const required = ['MONGO_URI', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0 && config.nodeEnv === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

module.exports = {
  config,
  validateConfig,
};

