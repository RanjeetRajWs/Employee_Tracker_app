const Session = require('../models/session');
const logger = require('../config/logger');


/**
 * Get daily report for a user
 * @route GET /admin/reports/daily/:userId/:date
 * @access Private (Admin only)
 */
exports.getDailyReport = async (req, res, next) => {
    try {
        const { userId, date } = req.params;

        logger.debug('Fetching daily report', { userId, date });

        const sessions = await Session.aggregate([
            {
                $match: {
                    userId,
                    date
                }
            },
            {
                $sort: { sessionStart: 1 }
            }
        ]);

        res.json({
            success: true,
            data: sessions
        });

    } catch (error) {
        logger.error('Error fetching daily report:', error);
        next(error);
    }
};

/**
 * Get weekly report for a user
 * @route GET /admin/reports/weekly/:userId/:date
 * @access Private (Admin only)
 */
exports.getWeeklyReport = async (req, res, next) => {
    try {
        const { userId, date } = req.params;

        logger.debug('Fetching weekly report', { userId, date });

        // Calculate week start and end
        const startDate = new Date(date);
        const dayOfWeek = startDate.getDay();
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() - dayOfWeek);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekStartStr = weekStart.toISOString().split('T')[0];
        const weekEndStr = weekEnd.toISOString().split('T')[0];

        // Use aggregation for summary and sessions
        const result = await Session.aggregate([
            {
                $match: {
                    userId,
                    date: { $gte: weekStartStr, $lte: weekEndStr }
                }
            },
            {
                $facet: {
                    summary: [
                        {
                            $group: {
                                _id: null,
                                totalSessions: { $sum: 1 },
                                totalWorkingTime: { $sum: { $ifNull: ['$workingTime', 0] } },
                                totalIdleTime: { $sum: { $ifNull: ['$idleTime', 0] } },
                                totalScreenshots: { $sum: { $ifNull: ['$screenshotCount', 0] } },
                                totalBreaks: { $sum: { $ifNull: ['$breaksTaken', 0] } }
                            }
                        }
                    ],
                    sessions: [
                        { $sort: { date: -1, sessionStart: -1 } }
                    ],
                    dailyData: [
                        {
                            $group: {
                                _id: '$date',
                                date: { $first: '$date' },
                                sessions: { $push: '$$ROOT' },
                                workingTime: { $sum: { $ifNull: ['$workingTime', 0] } },
                                idleTime: { $sum: { $ifNull: ['$idleTime', 0] } },
                                screenshots: { $sum: { $ifNull: ['$screenshotCount', 0] } },
                                breaks: { $sum: { $ifNull: ['$breaksTaken', 0] } }
                            }
                        },
                        { $sort: { date: -1 } }
                    ]
                }
            }
        ]);

        const summary = result[0].summary[0] || {
            totalSessions: 0,
            totalWorkingTime: 0,
            totalIdleTime: 0,
            totalScreenshots: 0,
            totalBreaks: 0
        };
        // console.log("🚀 ~ summary:", summary)
        const sessions = result[0].sessions;
        const dailyData = result[0].dailyData;
        // console.log("🚀 ~ sessions:", sessions)

        res.json({
            success: true,
            data: {
                weekStart: weekStartStr,
                weekEnd: weekEndStr,
                summary,
                sessions,
                dailyData
            }
        });

    } catch (error) {
        logger.error('Error fetching weekly report:', error);
        next(error);
    }
};

/**
 * Get monthly report for a user
 * @route GET /admin/reports/monthly/:userId/:month/:year
 * @access Private (Admin only)
 */
exports.getMonthlyReport = async (req, res, next) => {
    try {
        const { userId, month, year } = req.params;

        logger.debug('Fetching monthly report', { userId, month, year });

        // Calculate month start and end
        const monthInt = parseInt(month);
        const yearInt = parseInt(year);

        const monthStart = new Date(yearInt, monthInt - 1, 1);
        const monthEnd = new Date(yearInt, monthInt, 0);

        const monthStartStr = monthStart.toISOString().split('T')[0];
        const monthEndStr = monthEnd.toISOString().split('T')[0];

        // Use aggregation for summary and daily data
        const result = await Session.aggregate([
            {
                $match: {
                    userId,
                    date: { $gte: monthStartStr, $lte: monthEndStr }
                }
            },
            {
                $sort: { date: -1, sessionStart: -1 }
            },
            {
                $facet: {
                    summary: [
                        {
                            $group: {
                                _id: null,
                                totalSessions: { $sum: 1 },
                                totalWorkingTime: { $sum: { $ifNull: ['$workingTime', 0] } },
                                totalIdleTime: { $sum: { $ifNull: ['$idleTime', 0] } },
                                totalScreenshots: { $sum: { $ifNull: ['$screenshotCount', 0] } },
                                totalBreaks: { $sum: { $ifNull: ['$breaksTaken', 0] } }
                            }
                        }
                    ],
                    dailyData: [
                        {
                            $group: {
                                _id: '$date',
                                date: { $first: '$date' },
                                sessions: { $push: '$$ROOT' },
                                workingTime: { $sum: { $ifNull: ['$workingTime', 0] } },
                                idleTime: { $sum: { $ifNull: ['$idleTime', 0] } },
                                screenshots: { $sum: { $ifNull: ['$screenshotCount', 0] } },
                                breaks: { $sum: { $ifNull: ['$breaksTaken', 0] } }
                            }
                        },
                        { $sort: { date: -1 } }
                    ]
                }
            }
        ]);

        const summary = result[0].summary[0] || {
            totalSessions: 0,
            totalWorkingTime: 0,
            totalIdleTime: 0,
            totalScreenshots: 0,
            totalBreaks: 0
        };
        const dailyDataArray = result[0].dailyData;

        res.json({
            success: true,
            data: {
                month: monthInt,
                year: yearInt,
                summary,
                dailyData: dailyDataArray
            }
        });

    } catch (error) {
        console.error('Error fetching monthly report:', error);
        next(error);
    }
};
