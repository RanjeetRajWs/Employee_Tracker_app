const ActivityLog = require('../models/activityLog');
const logger = require('../config/logger');


/**
 * Get activity logs with filters
 * @route GET /admin/activity-logs
 * @access Private (Admin only)
 */
exports.getActivityLogs = async (req, res, next) => {
    try {
        const { userId, sessionId, activityType, startDate, endDate, page = 1, limit = 100 } = req.query;

        logger.debug('Fetching activity logs', { userId, sessionId, activityType, startDate, endDate });

        // Build query
        const query = {};

        if (userId) query.userId = userId;
        if (sessionId) query.sessionId = sessionId;
        if (activityType) query.activityType = activityType;

        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) {
                const start = !isNaN(startDate) ? parseInt(startDate) : startDate;
                query.timestamp.$gte = new Date(start);
            }
            if (endDate) {
                const end = !isNaN(endDate) ? parseInt(endDate) : endDate;
                query.timestamp.$lte = new Date(end);
            }
        }

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const logs = await ActivityLog.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .skip(skip)
            .populate('sessionId', 'date sessionStart sessionEnd');

        const total = await ActivityLog.countDocuments(query);

        res.json({
            success: true,
            data: logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error fetching activity logs:', error);
        next(error);
    }
};

/**
 * Get activity statistics
 * @route GET /admin/activity-logs/stats
 * @access Private (Admin only)
 */
exports.getActivityStats = async (req, res, next) => {
    try {
        const { userId, startDate, endDate } = req.query;

        logger.debug('Fetching activity statistics', { userId, startDate, endDate });

        const query = {};
        if (userId) query.userId = userId;
        if (startDate || endDate) {
            query.timestamp = {};
            if (startDate) {
                const start = !isNaN(startDate) ? parseInt(startDate) : startDate;
                query.timestamp.$gte = new Date(start);
            }
            if (endDate) {
                const end = !isNaN(endDate) ? parseInt(endDate) : endDate;
                query.timestamp.$lte = new Date(end);
            }
        }

        const stats = await ActivityLog.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$activityType',
                    count: { $sum: 1 },
                    totalDuration: { $sum: '$duration' },
                    avgDuration: { $avg: '$duration' }
                }
            }
        ]);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching activity stats:', error);
        next(error);
    }
};
