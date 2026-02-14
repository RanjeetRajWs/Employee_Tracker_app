const ActivityLog = require('../models/activityLog');
const logger = require('../config/logger');

/**
 * Activity logging middleware
 * Logs important user actions to the database
 */
const logActivity = (activityType) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;

        // Override send function to log after response
        res.send = function (data) {
            // Only log successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Extract user ID from various sources
                const userId = req.user?.id ||
                    req.body?.userId ||
                    req.params?.userId ||
                    req.query?.userId ||
                    'system';

                // Create activity log (async, don't wait)
                ActivityLog.create({
                    userId: userId.toString(),
                    userName: req.user?.username || 'system',
                    sessionId: req.body?.sessionId || null,
                    activityType: activityType,
                    timestamp: new Date(),
                    duration: 0,
                    metadata: {
                        method: req.method,
                        path: req.path,
                        ip: req.ip,
                        userAgent: req.get('user-agent'),
                        statusCode: res.statusCode
                    }
                }).catch(err => {
                    console.error('Failed to log activity:', err);
                });
            }

            // Call original send
            return originalSend.call(this, data);
        };

        next();
    };
};

/**
 * Log user login
 */
const logLogin = logActivity('active');

/**
 * Log session upload
 */
const logSessionUpload = logActivity('active');

/**
 * Log user logout
 */
const logLogout = logActivity('idle');

/**
 * Log break start
 */
const logBreakStart = logActivity('break');

module.exports = {
    logActivity,
    logLogin,
    logSessionUpload,
    logLogout,
    logBreakStart
};
