/**
 * Scheduled Tasks Utility
 * Manages cron jobs for automated maintenance tasks
 */

const cron = require('node-cron');
const sessionCleanup = require('./sessionCleanup');
const logger = require('../config/logger');
const path = require('path');

class ScheduledTasks {
    constructor() {
        this.tasks = {};
    }

    /**
     * Start all scheduled tasks
     */
    startAll() {
        this.startDailyCleanup();
        this.startWeeklyCompression();
        logger.info('✅ All scheduled tasks started');
    }

    /**
     * Stop all scheduled tasks
     */
    stopAll() {
        Object.keys(this.tasks).forEach(taskName => {
            if (this.tasks[taskName]) {
                this.tasks[taskName].stop();
                logger.info(`⏹️ Stopped task: ${taskName}`);
            }
        });
        this.tasks = {};
    }

    /**
     * Daily cleanup - runs at 2 AM every day
     * Removes sessions older than 90 days
     */
    startDailyCleanup() {
        // Run at 2:00 AM every day
        this.tasks.dailyCleanup = cron.schedule('0 2 * * *', async () => {
            logger.info('🧹 Running daily cleanup task...');

            try {
                const screenshotsDir = path.join(__dirname, '../../uploads/screenshots');
                const results = await sessionCleanup.runFullCleanup({
                    daysOld: 90,
                    screenshotsDir
                });

                logger.info('✅ Daily cleanup completed:', results);
            } catch (error) {
                logger.error('❌ Daily cleanup failed:', error);
            }
        });

        logger.info('📅 Daily cleanup task scheduled (2:00 AM)');
    }

    /**
     * Weekly compression - runs every Sunday at 3 AM
     * Compresses old screenshots to save space
     */
    startWeeklyCompression() {
        // Run at 3:00 AM every Sunday
        this.tasks.weeklyCompression = cron.schedule('0 3 * * 0', async () => {
            logger.info('🗜️ Running weekly compression task...');

            try {
                const imageCompression = require('./imageCompression');
                const screenshotsDir = path.join(__dirname, '../../uploads/screenshots');

                const results = await imageCompression.compressDirectory(screenshotsDir, {
                    quality: 70,
                    maxWidth: 1920,
                    maxHeight: 1080
                });

                logger.info('✅ Weekly compression completed:', results);
            } catch (error) {
                logger.error('❌ Weekly compression failed:', error);
            }
        });

        logger.info('📅 Weekly compression task scheduled (Sunday 3:00 AM)');
    }

    /**
     * Get status of all tasks
     */
    getStatus() {
        const status = {};

        Object.keys(this.tasks).forEach(taskName => {
            status[taskName] = {
                running: this.tasks[taskName] ? true : false
            };
        });

        return status;
    }
}

// Export singleton instance
const scheduledTasks = new ScheduledTasks();
module.exports = scheduledTasks;
