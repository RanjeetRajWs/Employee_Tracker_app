/**
 * Settings Service
 * Business logic for application settings
 * @module services/settingsService
 */

const Settings = require('../models/settings');
const logger = require('../config/logger');
const { SETTINGS_CONSTRAINTS } = require('../constants');
const { ValidationError } = require('../utils/errors');

/**
 * Get application settings
 * @returns {Promise<Object>} Settings object
 */
const getSettings = async () => {
  let settings = await Settings.findOne();

  if (!settings) {
    logger.info('No settings found, creating default settings');
    settings = await Settings.create({});
  }

  return settings;
};

/**
 * Update application settings
 * @param {Object} updateData - Settings data to update
 * @param {number} [updateData.screenshotInterval] - Screenshot interval in seconds
 * @param {number} [updateData.idleThreshold] - Idle threshold in seconds
 * @param {Object} [updateData.breakSchedules] - Break schedules
 * @param {number} [updateData.maxUsersAllowed] - Maximum users allowed
 * @param {boolean} [updateData.maintenanceMode] - Maintenance mode flag
 * @returns {Promise<Object>} Updated settings
 * @throws {ValidationError} If validation fails
 */
const updateSettings = async (updateData) => {
  const {
    screenshotInterval,
    idleThreshold,
    breakSchedules,
    maxUsersAllowed,
    maintenanceMode,
    allowScreenshotDeletion,
  } = updateData;

  // Validate screenshot interval
  if (screenshotInterval !== undefined) {
    const { MIN, MAX } = SETTINGS_CONSTRAINTS.SCREENSHOT_INTERVAL;
    if (screenshotInterval < MIN || screenshotInterval > MAX) {
      throw new ValidationError(
        `Screenshot interval must be between ${MIN} and ${MAX} seconds`
      );
    }
  }

  // Validate idle threshold
  if (idleThreshold !== undefined) {
    const { MIN, MAX } = SETTINGS_CONSTRAINTS.IDLE_THRESHOLD;
    if (idleThreshold < MIN || idleThreshold > MAX) {
      throw new ValidationError(
        `Idle threshold must be between ${MIN} and ${MAX} seconds`
      );
    }
  }

  // Get existing settings or create new
  let settings = await Settings.findOne();

  if (!settings) {
    settings = new Settings();
  }

  // Update fields
  if (screenshotInterval !== undefined) settings.screenshotInterval = screenshotInterval;
  if (idleThreshold !== undefined) settings.idleThreshold = idleThreshold;
  if (breakSchedules !== undefined) settings.breakSchedules = breakSchedules;
  if (maxUsersAllowed !== undefined) settings.maxUsersAllowed = maxUsersAllowed;
  if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
  if (allowScreenshotDeletion !== undefined) settings.allowScreenshotDeletion = allowScreenshotDeletion;
  if (updateData.hideOnMinimize !== undefined) settings.hideOnMinimize = updateData.hideOnMinimize;
  if (updateData.hideFromDockOnMinimize !== undefined) settings.hideFromDockOnMinimize = updateData.hideFromDockOnMinimize;
  if (updateData.hideFromTrayOnMinimize !== undefined) settings.hideFromTrayOnMinimize = updateData.hideFromTrayOnMinimize;
  if (updateData.hideBothOnMinimize !== undefined) settings.hideBothOnMinimize = updateData.hideBothOnMinimize;

  await settings.save();
  logger.info(`Settings updated successfully: ${settings._id}`);

  return settings;
};

/**
 * Reset settings to defaults
 * @returns {Promise<Object>} Default settings
 */
const resetSettings = async () => {
  // Delete existing settings
  await Settings.deleteMany({});

  // Create new default settings
  const settings = await Settings.create({});

  logger.info('Settings reset to defaults');
  return settings;
};

module.exports = {
  getSettings,
  updateSettings,
  resetSettings,
};

