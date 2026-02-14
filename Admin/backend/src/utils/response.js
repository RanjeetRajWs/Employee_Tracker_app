/**
 * Response Utility Functions
 * Provides consistent API response formatting
 * @module utils/response
 */

const { HTTP_STATUS, MESSAGES } = require('../constants');

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} JSON response
 */
const sendSuccess = (res, data = null, message = null, statusCode = HTTP_STATUS.OK) => {
  const response = {
    success: true,
    ...(message && { message }),
    ...(data && { data }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {*} errors - Additional error details
 * @returns {Object} JSON response
 */
const sendError = (res, message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
  };
  return res.status(statusCode).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination metadata
 * @param {number} pagination.page - Current page
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.total - Total items
 * @returns {Object} JSON response
 */
const sendPaginated = (res, data, pagination) => {
  const { page, limit, total } = pagination;
  return res.status(HTTP_STATUS.OK).json({
    success: true,
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: parseInt(total),
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
};

module.exports = {
  sendSuccess,
  sendError,
  sendPaginated,
};

