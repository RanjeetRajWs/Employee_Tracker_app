/**
 * User Controller
 * Handles HTTP requests for user (employee) operations
 * @module controllers/userController
 */

const userService = require('../services/userService');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { HTTP_STATUS, MESSAGES } = require('../constants');
const { getIO } = require('../sockets/socketManager');

/**
 * Create new user (Employee)
 * @route POST /admin/users
 * @access Private (Admin/Superadmin)
 */
const createUser = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    const user = await userService.createUser({ username, email, password, role });

    return sendSuccess(res, { user }, MESSAGES.USER_CREATED, HTTP_STATUS.CREATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all users
 * @route GET /admin/users
 * @access Private (Admin/Superadmin)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, isActive, role, isOnline, search } = req.query;
    const result = await userService.getAllUsers({ page, limit, isActive, role, isOnline, search });

    return sendPaginated(res, result.users, result.pagination);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * @route GET /admin/users/:id
 * @access Private (Admin/Superadmin)
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    return sendSuccess(res, { user });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user
 * @route PUT /admin/users/:id
 * @access Private (Admin/Superadmin)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, email, role, isActive, password } = req.body;
    const user = await userService.updateUser(id, { username, email, role, isActive, password });

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.emit('user-status-changed', { userId: id, isActive: user.isActive });
    } catch (error) {
      // Ignore socket errors to prevent API failure
    }

    return sendSuccess(res, { user }, MESSAGES.USER_UPDATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (soft delete)
 * @route DELETE /admin/users/:id
 * @access Private (Admin/Superadmin)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await userService.deleteUser(id);

    return sendSuccess(res, null, MESSAGES.USER_DELETED);
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate user (for Employee Tracker login)
 * @route POST /admin/users/authenticate
 * @access Public
 */
const authenticateUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await userService.authenticateUser(email, password);

    // result now contains { user, token }
    return sendSuccess(res, result, 'Authentication successful');
  } catch (error) {
    next(error);
  }
};

/**
 * Change user password (for Employee Tracker)
 * @route PUT /admin/users/change-password
 * @access Public
 */
const changeUserPassword = async (req, res, next) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;
    await userService.changeUserPassword(userId, oldPassword, newPassword);

    return sendSuccess(res, null, MESSAGES.PASSWORD_CHANGED);
  } catch (error) {
    next(error);
  }
};

/**
 * Get user status (for Employee Tracker status check)
 * @route GET /admin/users/status/:userId
 * @access Public
 */
const getUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = await userService.getUserStatus(userId);

    return sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
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
};
