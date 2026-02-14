/**
 * Admin Controller
 * Handles HTTP requests for admin operations
 * @module controllers/adminController
 */

const adminService = require('../services/adminService');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { HTTP_STATUS, MESSAGES } = require('../constants');
const { AuthenticationError } = require('../utils/errors');

/**
 * Login admin
 * @route POST /admin/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { admin, token } = await adminService.login(email, password);
    
    return sendSuccess(res, { admin, token }, MESSAGES.LOGIN_SUCCESS, HTTP_STATUS.OK);
  } catch (error) {
    next(error);
  }
};

/**
 * Register new admin
 * @route POST /admin/register
 * @access Public
 */
const registerAdmin = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    const { admin, token } = await adminService.register({ username, email, password, role });
    
    return sendSuccess(res, { admin, token }, MESSAGES.REGISTER_SUCCESS, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get current admin profile
 * @route GET /admin/me
 * @access Private
 */
const getProfile = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthenticationError(MESSAGES.UNAUTHORIZED);
    
    // Fetch full profile based on user role to get extended fields
    let fullProfile;
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      const adminModel = require('../models/admin');
      fullProfile = await adminModel.findById(req.user.id).lean();
    } else {
      const User = require('../models/user');
      fullProfile = await User.findById(req.user.id).lean();
    }

    if (!fullProfile) {
       // Fallback to basic info from token if DB fetch fails (unlikely)
       return sendSuccess(res, { admin: req.user });
    }
    
    // Remove sensitive data
    delete fullProfile.password;
    if (fullProfile.__v !== undefined) delete fullProfile.__v;

    return sendSuccess(res, { admin: fullProfile });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user profile
 * @route PUT /admin/me
 * @access Private
 */
const updateProfile = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthenticationError(MESSAGES.UNAUTHORIZED);

    const updateData = req.body;
    
    // Prevent updating sensitive fields directly through this endpoint
    delete updateData.password;
    delete updateData.role; 
    delete updateData.email; // Email updates should go through a specific flow if needed
    delete updateData.isActive;
    delete updateData._id;

    let updatedProfile;
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      const adminModel = require('../models/admin');
      updatedProfile = await adminModel.findByIdAndUpdate(
        req.user.id, 
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password');
    } else {
      const User = require('../models/user');
      updatedProfile = await User.findByIdAndUpdate(
        req.user.id, 
        { $set: updateData }, 
        { new: true, runValidators: true }
      ).select('-password');
    }

    return sendSuccess(res, { admin: updatedProfile }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

// Note: getAllUsers, getUserById, updateUser, and deleteUser have been removed 
// as they are now handled by userController.js and userService.js


/**
 * Change password
 * @route POST /admin/change-password
 * @access Private
 */
const changePassword = async (req, res, next) => {
  try {
    if (!req.user) throw new AuthenticationError(MESSAGES.UNAUTHORIZED);
    
    const { currentPassword, newPassword } = req.body;
    await adminService.changePassword(req.user._id.toString(), currentPassword, newPassword);
    
    return sendSuccess(res, null, MESSAGES.PASSWORD_CHANGED);
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 * @route POST /admin/password-reset/request
 * @access Public
 */
const requestPasswordReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const resetToken = await adminService.requestPasswordReset(email);
    
    const response = { message: MESSAGES.PASSWORD_RESET_SENT };
    if (process.env.NODE_ENV === 'development' && resetToken) {
      response.resetToken = resetToken;
    }
    
    return sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
};

/**
 * Confirm password reset
 * @route POST /admin/password-reset/confirm
 * @access Public
 */
const confirmPasswordReset = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    await adminService.confirmPasswordReset(token, newPassword);
    
    return sendSuccess(res, null, MESSAGES.PASSWORD_RESET_SUCCESS);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  registerAdmin,
  getProfile,
  updateProfile,
  changePassword,
  requestPasswordReset,
  confirmPasswordReset,
};