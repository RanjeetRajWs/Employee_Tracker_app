/**
 * User Service
 * Business logic for user (employee) operations
 * @module services/userService
 */

const User = require('../models/user');
const Attendance = require('../models/attendance');
const ClockOutRequest = require('../models/clockOutRequest');
const logger = require('../config/logger');
const { onlineUsers } = require('../sockets/socketManager');
const { PAGINATION } = require('../constants');
const {
  ValidationError,
  ConflictError,
  NotFoundError,
} = require('../utils/errors');

/**
 * Sanitize user object (remove sensitive data)
 * @param {Object} user - User document
 * @returns {Object} Sanitized user object
 */
const sanitizeUser = (user) => {
  if (!user) return null;

  return {
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    lastLogin: user.lastLogin,
    lastActive: user.lastActive,
    updatedAt: user.updatedAt,
  };
};

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 * @throws {ConflictError} If user already exists
 */
const createUser = async (userData) => {
  const { username, email, password, role } = userData;

  if (!username || !email || !password) {
    throw new ValidationError('Username, email and password are required');
  }

  // Check if user already exists
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    throw new ConflictError('User with given email or username already exists');
  }

  const user = new User({
    username,
    email,
    password,
    role: role || 'user',
  });

  await user.save();
  logger.info(`New user created: ${user.email}`);

  return sanitizeUser(user);
};

/**
 * Get all users with pagination
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Paginated user list
 */
const getAllUsers = async (filters = {}) => {
  const {
    page = PAGINATION.DEFAULT_PAGE,
    limit = PAGINATION.DEFAULT_LIMIT,
    isActive,
    role,
    isOnline,
    search,
  } = filters;

  const query = {};
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (role && role !== 'all') query.role = role;

  if (isOnline === 'true') {
    query._id = { $in: Array.from(onlineUsers) };
  }

  if (search) {
    query.$or = [
      { email: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await User.find(query)
    .select('-password')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(query);

  return {
    users: users.map(sanitizeUser),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get user by ID
 * @param {string} id - User ID
 * @returns {Promise<Object>} User data
 * @throws {NotFoundError} If user not found
 */
const getUserById = async (id) => {
  const user = await User.findById(id).select('-password');

  if (!user) {
    throw new NotFoundError('User not found');
  }

  return sanitizeUser(user);
};

/**
 * Update user
 * @param {string} id - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated user
 * @throws {NotFoundError} If user not found
 * @throws {ConflictError} If email/username already exists
 */
const updateUser = async (id, updateData) => {
  const { username, email, role, isActive, password } = updateData;

  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if email/username already exists for another user
  if (email || username) {
    const existing = await User.findOne({
      _id: { $ne: id },
      $or: [
        ...(email ? [{ email }] : []),
        ...(username ? [{ username }] : []),
      ],
    });

    if (existing) {
      throw new ConflictError('Email or username already in use');
    }
  }

  if (username) user.username = username;
  if (email) user.email = email;
  if (role) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  if (password) user.password = password; // Will be hashed by pre-save hook

  await user.save();
  logger.info(`User updated: ${user.email}`);

  return sanitizeUser(user);
};

/**
 * Delete user (soft delete)
 * @param {string} id - User ID
 * @returns {Promise<void>}
 * @throws {NotFoundError} If user not found
 */
const deleteUser = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  user.isActive = false;
  await user.save();
  logger.info(`User deactivated: ${user.email}`);
};

/**
 * Authenticate user (for Employee Tracker login)
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User data with JWT token
 * @throws {NotFoundError} If credentials are invalid
 * @throws {ValidationError} If account is deactivated
 */
const authenticateUser = async (email, password) => {
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const user = await User.findOne({ email });

  if (!user) {
    logger.warn(`Failed login attempt for email: ${email}`);
    throw new NotFoundError('Invalid email or password');
  }

  if (!user.isActive) {
    logger.warn(`Login attempt for deactivated account: ${email}`);
    throw new ValidationError(
      'Your account has been deactivated. Please contact your administrator.'
    );
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    logger.warn(`Failed login attempt (invalid password) for email: ${email}`);
    throw new NotFoundError('Invalid email or password');
  }

  // Update last login timestamp
  user.lastLogin = Date.now();
  await user.save();

  // Generate JWT token (same as admin authentication)
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
  const { JWT_CONFIG } = require('../constants');
  const JWT_EXPIRES_IN = JWT_CONFIG.EXPIRES_IN;

  const token = jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Sanitize user data
  const safeUser = sanitizeUser(user);

  // Add userId field for frontend compatibility
  safeUser.userId = safeUser.id;

  // Check if using temporary password
  safeUser.tempPassword = user.tempPassword === true;

  logger.info(`User authenticated successfully: ${user.email}`);

  // Return user data with token (matching admin authentication pattern)
  return { user: safeUser, token };
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} oldPassword - Old password
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 * @throws {NotFoundError} If user not found
 * @throws {ValidationError} If password is invalid
 */
const changeUserPassword = async (userId, oldPassword, newPassword) => {
  if (!userId || !oldPassword || !newPassword) {
    throw new ValidationError(
      'User ID, old password, and new password are required'
    );
  }

  if (newPassword.length < 6) {
    throw new ValidationError('New password must be at least 6 characters long');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const isOldPasswordValid = await user.comparePassword(oldPassword);
  if (!isOldPasswordValid) {
    throw new ValidationError('Current password is incorrect');
  }

  user.password = newPassword; // Will be hashed by pre-save hook
  user.tempPassword = false;
  await user.save();

  logger.info(`Password changed for user: ${user.email}`);
};

/**
 * Get user status
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User status
 * @throws {NotFoundError} If user not found
 */
const getUserStatus = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check Attendance Logic (Source of Truth for Clock-In Status)
  const today = new Date().toISOString().split('T')[0];
  const attendance = await Attendance.findOne({ userId, date: today });
  
  let isClockedIn = false;
  let clockInTime = null;
  let clockInLocation = null;

  if (attendance) {
      const sessions = attendance.clockIN_out?.attend || [];
      if (sessions.length > 0) {
          const lastSession = sessions[sessions.length - 1];
          // If clockIn exists and clockOut.time is null/missing, user is currently clocked in
          if (lastSession.clockIn && (!lastSession.clockOut || !lastSession.clockOut.time)) {
              isClockedIn = true;
              clockInTime = lastSession.clockIn.time;
              clockInLocation = lastSession.clockIn.location;
          }
      }
  }

  // Check ClockOut Request Logic
  const pendingRequest = await ClockOutRequest.findOne({ 
      userId, 
      status: 'pending' 
  });
  
  const approvedRequest = await ClockOutRequest.findOne({
      userId,
      status: 'approved',
      updatedAt: { $gte: new Date(new Date().setHours(0,0,0,0)) }
  });

  return {
    status: user.isActive ? 'active' : 'suspended',
    user: sanitizeUser(user),
    isClockedIn,              // Used by Tracker App
    clockInTime,              // Used by Tracker App
    clockInLocation,          // Used by Tracker App
    isClockOutRequestPending: !!pendingRequest, // Used by Tracker App
    isEarlyClockOutApproved: !!approvedRequest  // Used by Tracker App
  };
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  authenticateUser,
  changeUserPassword,
  getUserStatus,
  sanitizeUser,
};

