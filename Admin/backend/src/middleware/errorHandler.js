const logger = require('../config/logger');

/**
 * Enhanced Error Handler Middleware
 * Handles different types of errors with appropriate responses
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        error.message = 'Resource not found';
        error.statusCode = 404;
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'Field';
        error.message = `${field} already exists`;
        error.statusCode = 409;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors || {}).map((val) => val.message);
        error.message = messages.length > 0 ? messages.join(', ') : err.message;
        error.statusCode = 400;
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token';
        error.statusCode = 401;
    }

    if (err.name === 'TokenExpiredError') {
        error.message = 'Token expired';
        error.statusCode = 401;
    }

    // Default to 500 server error
    const statusCode = error.statusCode || err.statusCode || 500;
    const message = error.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && {
            error: err,
            stack: err.stack,
        }),
    });
};

module.exports = errorHandler;
