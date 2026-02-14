/**
 * Settings Controller
 * Handles HTTP requests for application settings
 * @module controllers/settingsController
 */

const settingsService = require('../services/settingsService');
const { sendSuccess } = require('../utils/response');
const { MESSAGES } = require('../constants');
const { getIO } = require('../sockets/socketManager');
const logger = require('../config/logger');

/**
 * Get application settings
 * @route GET /admin/settings
 * @access Public (for now, can be made private)
 */
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    return sendSuccess(res, settings);
  } catch (error) {
    next(error);
  }
};

/**
 * Update application settings
 * @route PUT /admin/settings
 * @access Private (Admin/Superadmin only)
 */
exports.updateSettings = async (req, res, next) => {
  try {
    logger.debug('Updating settings:', req.body);
    const settings = await settingsService.updateSettings(req.body);

    // Emit socket event for real-time update
    try {
      const io = getIO();
      io.emit('settings-updated', settings);
    } catch (error) {
      // Ignore socket errors
    }

    return sendSuccess(res, settings, MESSAGES.SETTINGS_UPDATED);
  } catch (error) {
    next(error);
  }
};

/**
 * Reset settings to defaults
 * @route POST /admin/settings/reset
 * @access Private (Admin/Superadmin only)
 */
exports.resetSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.resetSettings();
    return sendSuccess(res, settings, MESSAGES.SETTINGS_RESET);
  } catch (error) {
    next(error);
  }
};
