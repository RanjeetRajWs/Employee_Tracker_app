/**
 * Application Constants
 * @module constants
 */

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000',
  TIMEOUT: 30000,
};

/**
 * Local Storage Keys
 */
export const STORAGE_KEYS = {
  ADMIN_TOKEN: 'adminToken',
  ADMIN: 'admin',
  CURRENT_PAGE: 'adminCurrentPage',
  THEME: 'theme',
};

/**
 * Route Paths
 */
export const ROUTES = {
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  TRACKING: '/tracking',
  ATTENDANCE: '/attendance',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  BREAK_REQUESTS: '/breaks',
  LEAVES: '/leaves',
  CHANGE_PASSWORD: '/change-password',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  USER_DASHBOARD: '/user/dashboard',
  PROFILE: '/user/profile',
};

/**
 * Toast Types
 */
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

/**
 * User Roles
 */
export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
};

/**
 * Pagination Defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

/**
 * Date Formats
 */
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  FULL: 'MMMM DD, YYYY',
  TIME: 'HH:mm',
  DATETIME: 'MMM DD, YYYY HH:mm',
};

/**
 * Validation Rules
 */
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

