const Session = require('../models/session');
const logger = require('../config/logger');


/**
 * Get all sessions with filters
 * @route GET /admin/sessions
 * @access Private (Admin only)
 */
exports.getAllSessions = async (req, res, next) => {
    try {
        const { userId, startDate, endDate, isActive, page = 1, limit = 50 } = req.query;

        console.log('Fetching sessions', { userId, startDate, endDate, isActive });

        // Build query
        const query = {};

        if (userId) query.userId = userId;
        if (isActive !== undefined) query.isActive = isActive === 'true';

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = startDate;
            if (endDate) query.date.$lte = endDate;
        }

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sessions = await Session.find(query)
            .sort({ sessionStart: -1 })
            .limit(parseInt(limit))
            .skip(skip);

        const total = await Session.countDocuments(query);

        res.json({
            success: true,
            data: sessions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        logger.error('Error fetching sessions:', error);
        next(error);
    }
};

/**
 * Get session by ID
 * @route GET /admin/sessions/:id
 * @access Private (Admin only)
 */
exports.getSessionById = async (req, res, next) => {
    try {
        const { id } = req.params;

        logger.debug('Fetching session by ID', { sessionId: id });

        const session = await Session.findById(id);

        if (!session) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }

        res.json({
            success: true,
            data: session
        });

    } catch (error) {
        logger.error('Error fetching session:', error);
        next(error);
    }
};

/**
 * Get session statistics
 * @route GET /admin/sessions/stats
 * @access Private (Admin only)
 */
exports.getSessionStats = async (req, res, next) => {
    try {
        const { userId, startDate, endDate } = req.query;

        console.log('Fetching session statistics', { userId, startDate, endDate });

        const query = {};
        if (userId) query.userId = userId;
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = startDate;
            if (endDate) query.date.$lte = endDate;
        }

        const stats = await Session.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    totalSessions: { $sum: 1 },
                    totalWorkingTime: { $sum: '$workingTime' },
                    totalIdleTime: { $sum: '$idleTime' },
                    totalScreenshots: { $sum: '$screenshotCount' },
                    totalBreaks: { $sum: '$breaksTaken' },
                    avgWorkingTime: { $avg: '$workingTime' },
                    avgIdleTime: { $avg: '$idleTime' }
                }
            }
        ]);

        const result = stats.length > 0 ? stats[0] : {
            totalSessions: 0,
            totalWorkingTime: 0,
            totalIdleTime: 0,
            totalScreenshots: 0,
            totalBreaks: 0,
            avgWorkingTime: 0,
            avgIdleTime: 0
        };

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Error fetching session stats:', error);
        next(error);
    }
};
