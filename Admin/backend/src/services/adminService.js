/**
 * Admin Service
 * Business logic for admin operations
 * @module services/adminService
 */

const adminModel = require('../models/admin');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../config/logger');
const { JWT_CONFIG, PASSWORD_RESET_EXPIRY } = require('../constants');
const {
  AuthenticationError,
  NotFoundError,
  ConflictError,
  ValidationError,
} = require('../utils/errors');

/**
 * Generate JWT token
 * @param {Object} payload - Token payload
 * @returns {string} JWT token
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET || 'supersecret';
  return jwt.sign(payload, secret, { expiresIn: JWT_CONFIG.EXPIRES_IN });
};

/**
 * Sanitize admin object (remove sensitive data)
 * @param {Object} admin - Admin document
 * @returns {Object} Sanitized admin object
 */
const sanitizeAdmin = (admin) => {
  if (!admin) return null;
  
  // Handle both Mongoose documents and plain objects (from middleware)
  const id = admin._id ? admin._id.toString() : (admin.id ? admin.id.toString() : null);
  
  return {
    id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive,
    createdAt: admin.createdAt,
    lastLogin: admin.lastLogin,
    lastActive: admin.lastActive,
  };
};

/**
 * Login admin user
 * @param {string} email - Admin email
 * @param {string} password - Admin password
 * @returns {Promise<Object>} Admin data and token
 * @throws {AuthenticationError} If credentials are invalid
 */
const login = async (email, password) => {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  // Check Admin collection first
  let user = await adminModel.findOne({ email, isActive: true });
  let isUserCollection = false;

  if (!user) {
    // If not found in Admin, check User collection
    const User = require('../models/user');
    user = await User.findOne({ email, isActive: true });
    isUserCollection = true;
  }

  if (!user) {
    logger.warn(`Failed login attempt for email: ${email}`);
    throw new AuthenticationError('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    logger.warn(`Failed login attempt for email: ${email}`);
    throw new AuthenticationError('Invalid email or password');
  }

  // Update last login
  user.lastLogin = Date.now();
  await user.save();

  const userRole = user.role || (isUserCollection ? 'user' : 'admin');
  
  const token = generateToken({ 
    id: user._id.toString(), 
    role: userRole,
    email: user.email 
  });
  
  // Construct a consistent user object for the frontend
  const safeUser = {
    id: user._id.toString(),
    username: user.username || email.split('@')[0],
    email: user.email,
    role: userRole,
    isActive: user.isActive,
    lastLogin: user.lastLogin
  };

  logger.info(`${isUserCollection ? 'User' : 'Admin'} logged in successfully: ${user.email} (ID: ${safeUser.id}, Role: ${safeUser.role})`);
  return { admin: safeUser, token };
};

/**
 * Register new admin
 * @param {Object} adminData - Admin registration data
 * @param {string} adminData.username - Username
 * @param {string} adminData.email - Email
 * @param {string} adminData.password - Password
 * @param {string} [adminData.role] - Admin role
 * @returns {Promise<Object>} Admin data and token
 * @throws {ConflictError} If admin already exists
 */
const register = async (adminData) => {
  const { username, email, password, role } = adminData;

  if (!username || !email || !password) {
    throw new ValidationError('Username, email and password are required');
  }

  // Check if admin already exists
  const existing = await adminModel.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    throw new ConflictError('User with given email or username already exists');
  }

  const admin = new adminModel({
    username,
    email,
    password,
    role: role || 'admin',
  });
  await admin.save();

  const token = generateToken({ id: admin._id.toString(), role: admin.role });
  const safeAdmin = sanitizeAdmin(admin);

  logger.info(`New admin registered: ${admin.email}`);
  return { admin: safeAdmin, token };
};

// getById, getAll, update, and remove functions have been removed
// as user management is now handled by userService.js


/**
 * Change admin password
 * @param {string} adminId - Admin ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 * @throws {NotFoundError} If admin not found
 * @throws {AuthenticationError} If current password is incorrect
 */
const changePassword = async (adminId, currentPassword, newPassword) => {
  const admin = await adminModel.findById(adminId);
  if (!admin) {
    throw new NotFoundError('Admin not found');
  }

  const isMatch = await admin.comparePassword(currentPassword);
  if (!isMatch) {
    throw new AuthenticationError('Current password is incorrect');
  }

  admin.password = newPassword;
  await admin.save();
  logger.info(`Password changed for admin: ${admin.email}`);
};

/**
 * Request password reset
 * @param {string} email - Admin email
 * @returns {Promise<string>} Reset token (only in development)
 * @throws {NotFoundError} If admin not found
 */
const requestPasswordReset = async (email) => {
  const admin = await adminModel.findOne({ email, isActive: true });

  // Always return success to prevent email enumeration
  if (!admin) {
    logger.warn(`Password reset requested for non-existent email: ${email}`);
    return null;
  }

  const resetToken = admin.generatePasswordResetToken();
  await admin.save();

  // In production, send email with reset token
  // For development, return token
  if (process.env.NODE_ENV === 'development') {
    logger.info(`Password reset token for ${email}: ${resetToken}`);
    return resetToken;
  }

  // TODO: Send email in production
  return null;
};

/**
 * Confirm password reset
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 * @throws {ValidationError} If token is invalid or expired
 */
const confirmPasswordReset = async (token, newPassword) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const admin = await adminModel.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!admin) {
    throw new ValidationError('Invalid or expired reset token');
  }

  admin.password = newPassword;
  admin.passwordResetToken = undefined;
  admin.passwordResetExpires = undefined;
  await admin.save();

  logger.info(`Password reset completed for admin: ${admin.email}`);
};

module.exports = {
  login,
  register,
  changePassword,
  requestPasswordReset,
  confirmPasswordReset,
  generateToken,
  sanitizeAdmin,
};

