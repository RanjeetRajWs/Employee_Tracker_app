/**
 * Application Constants
 * @module constants
 */

/**
 * User roles
 */
const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
};

/**
 * Admin roles that can access admin routes
 */
const ADMIN_ROLES = [ROLES.SUPERADMIN, ROLES.ADMIN];

/**
 * HTTP Status Codes
 */
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * Pagination defaults
 */
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

/**
 * Settings validation constraints
 */
const SETTINGS_CONSTRAINTS = {
  SCREENSHOT_INTERVAL: {
    MIN: 10,
    MAX: 600,
    DEFAULT: 30,
  },
  IDLE_THRESHOLD: {
    MIN: 15,
    MAX: 600,
    DEFAULT: 30,
  },
};

/**
 * JWT Configuration
 */
const JWT_CONFIG = {
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '365d',
  REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '365d',
};

/**
 * Password reset token expiration (10 minutes)
 */
const PASSWORD_RESET_EXPIRY = 10 * 60 * 1000;

/**
 * API Response Messages
 */
const MESSAGES = {
  // Auth
  LOGIN_SUCCESS: 'Login successful',
  LOGIN_FAILED: 'Invalid email or password',
  REGISTER_SUCCESS: 'Admin created successfully',
  LOGOUT_SUCCESS: 'Logout successful',
  PASSWORD_CHANGED: 'Password changed successfully',
  PASSWORD_RESET_SENT: 'If the email exists, a password reset link has been sent',
  PASSWORD_RESET_SUCCESS: 'Password reset successful',
  
  // User Management
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deactivated successfully',
  USER_NOT_FOUND: 'User not found',
  
  // Settings
  SETTINGS_UPDATED: 'Settings updated successfully',
  SETTINGS_RESET: 'Settings reset to defaults',
  
  // General
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Access forbidden',
  NOT_FOUND: 'Resource not found',
  VALIDATION_ERROR: 'Validation failed',
  SERVER_ERROR: 'Internal server error',
};

module.exports = {
  ROLES,
  ADMIN_ROLES,
  HTTP_STATUS,
  PAGINATION,
  SETTINGS_CONSTRAINTS,
  JWT_CONFIG,
  PASSWORD_RESET_EXPIRY,
  MESSAGES,
};

