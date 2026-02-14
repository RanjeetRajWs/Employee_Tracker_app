const logger = require('../config/logger');
const Admin = require('../models/admin');
const User = require('../models/user');
const Session = require('../models/session');
const BreakRequest = require('../models/breakRequest');

/**
 * Get dashboard statistics
 * @route GET /admin/analytics/stats
 * @access Private (Admin only)
 */
exports.getDashboardStats = async (req, res, next) => {
    try {
        logger.debug('Fetching dashboard statistics');

        // Use Employee users collection for primary user metrics
        const totalUsers = await User.countDocuments({ isActive: true });

        // Time window: last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Distinct employees who had at least one session in the last 24h
        const activeUserIds = await Session.distinct('userId', {
            sessionStart: { $gte: oneDayAgo }
        });
        const activeUsers = activeUserIds.length;

        // Sessions that started in the last 24h
        const activeSessions = await Session.countDocuments({
            sessionStart: { $gte: oneDayAgo }
        });

        // Aggregate over all sessions for totals/averages
        const sessionAgg = await Session.aggregate([
            {
                $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    totalWorkingTime: { $sum: '$workingTime' },
                    totalIdleTime: { $sum: '$idleTime' },
                    avgWorkingTime: { $avg: '$workingTime' }
                }
            }
        ]);

        const sessionStats = sessionAgg[0] || {
            totalSessions: 0,
            totalWorkingTime: 0,
            totalIdleTime: 0,
            avgWorkingTime: 0
        };

        // Count pending break requests
        const pendingBreaks = await BreakRequest.countDocuments({ status: 'pending' });
        logger.debug('Pending breaks:', pendingBreaks);

        const stats = {
            totalUsers,
            activeUsers,
            activeSessions,
            totalSessions: sessionStats.totalSessions,
            avgWorkingTime: sessionStats.avgWorkingTime,
            totalWorkingTime: sessionStats.totalWorkingTime,
            totalIdleTime: sessionStats.totalIdleTime,
            pendingBreaks
        };

        logger.info('Dashboard stats retrieved successfully');
        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        logger.error('Error fetching dashboard stats:', error);
        next(error);
    }
};

/**
 * Get user activity analytics
 * @route GET /admin/analytics/activity
 * @access Private (Admin only)
 */
exports.getUserActivity = async (req, res, next) => {
    try {
        const { startDate, endDate } = req.query;

        logger.debug('Fetching user activity analytics', { startDate, endDate });

        // Get users created within date range
        const query = {};
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const users = await Admin.find(query)
            .select('username email role createdAt lastLogin isActive')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: {
                users,
                count: users.length
            }
        });

    } catch (error) {
        logger.error('Error fetching user activity:', error);
        next(error);
    }
};
