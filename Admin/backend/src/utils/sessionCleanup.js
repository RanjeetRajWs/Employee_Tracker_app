/**
 * Session Cleanup Utility
 * Removes old session data and orphaned screenshots
 */

const Session = require('../models/session');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

/**
 * Delete sessions older than specified days
 * @param {number} daysOld - Number of days to keep (default: 90)
 * @returns {Promise<number>} Number of sessions deleted
 */
async function deleteOldSessions(daysOld = 90) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

        const result = await Session.deleteMany({
            date: { $lt: cutoffDateStr }
        });

        logger.info(`Deleted ${result.deletedCount} sessions older than ${daysOld} days`);
        return result.deletedCount;
    } catch (error) {
        logger.error('Error deleting old sessions:', error);
        throw error;
    }
}

/**
 * Clean up orphaned screenshot files
 * Removes screenshot files that don't have corresponding session records
 * @param {string} screenshotsDir - Path to screenshots directory
 * @returns {Promise<number>} Number of files deleted
 */
async function cleanupOrphanedScreenshots(screenshotsDir) {
    try {
        if (!fs.existsSync(screenshotsDir)) {
            logger.warn(`Screenshots directory does not exist: ${screenshotsDir}`);
            return 0;
        }

        // Get all screenshot files
        const files = fs.readdirSync(screenshotsDir)
            .filter(f => f.endsWith('.png'));

        let deletedCount = 0;

        // Get all screenshot paths from database
        const sessions = await Session.find({}, 'screenshots');
        const dbScreenshotPaths = new Set();

        sessions.forEach(session => {
            if (session.screenshots && Array.isArray(session.screenshots)) {
                session.screenshots.forEach(screenshot => {
                    if (screenshot.path || screenshot.url) {
                        const filename = path.basename(screenshot.path || screenshot.url);
                        dbScreenshotPaths.add(filename);
                    }
                });
            }
        });

        // Delete files not in database
        for (const file of files) {
            if (!dbScreenshotPaths.has(file)) {
                const filePath = path.join(screenshotsDir, file);
                try {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    logger.info(`Deleted orphaned screenshot: ${file}`);
                } catch (err) {
                    logger.error(`Failed to delete file ${file}:`, err);
                }
            }
        }

        logger.info(`Cleaned up ${deletedCount} orphaned screenshot files`);
        return deletedCount;
    } catch (error) {
        logger.error('Error cleaning up orphaned screenshots:', error);
        throw error;
    }
}

/**
 * Get storage statistics
 * @returns {Promise<Object>} Storage stats
 */
async function getStorageStats() {
    try {
        const totalSessions = await Session.countDocuments();
        const activeSessions = await Session.countDocuments({ isActive: true });

        // Calculate total screenshot count
        const sessions = await Session.find({}, 'screenshots screenshotCount');
        let totalScreenshots = 0;

        sessions.forEach(session => {
            totalScreenshots += session.screenshotCount || 0;
        });

        // Calculate date range
        const oldestSession = await Session.findOne().sort({ date: 1 });
        const newestSession = await Session.findOne().sort({ date: -1 });

        return {
            totalSessions,
            activeSessions,
            totalScreenshots,
            dateRange: {
                oldest: oldestSession?.date,
                newest: newestSession?.date
            }
        };
    } catch (error) {
        logger.error('Error getting storage stats:', error);
        throw error;
    }
}

/**
 * Run full cleanup
 * @param {Object} options - Cleanup options
 * @param {number} options.daysOld - Days to keep sessions
 * @param {string} options.screenshotsDir - Screenshots directory path
 * @returns {Promise<Object>} Cleanup results
 */
async function runFullCleanup(options = {}) {
    const { daysOld = 90, screenshotsDir } = options;

    logger.info('Starting full cleanup...');

    const results = {
        sessionsDeleted: 0,
        screenshotsDeleted: 0,
        errors: []
    };

    try {
        // Delete old sessions
        results.sessionsDeleted = await deleteOldSessions(daysOld);
    } catch (error) {
        results.errors.push(`Session deletion failed: ${error.message}`);
    }

    try {
        // Cleanup orphaned screenshots
        if (screenshotsDir) {
            results.screenshotsDeleted = await cleanupOrphanedScreenshots(screenshotsDir);
        }
    } catch (error) {
        results.errors.push(`Screenshot cleanup failed: ${error.message}`);
    }

    logger.info('Cleanup completed:', results);
    return results;
}

module.exports = {
    deleteOldSessions,
    cleanupOrphanedScreenshots,
    getStorageStats,
    runFullCleanup
};
