const logger = require('../config/logger');
const { getIO } = require('../sockets/socketManager');

/**
 * Capture screenshot for a specific user
 * Sends a socket event to the user's app to trigger screenshot capture
 */
exports.captureScreenshot = async (req, res, next) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'userId is required' 
            });
        }

        // Send socket event to trigger screenshot capture on the user's device
        try {
            const io = getIO();
            io.to(`user-${userId}`).emit('capture-screenshot', {
                userId,
                timestamp: Date.now(),
                triggeredBy: 'admin',
                adminId: req.user?._id
            });

            logger.info(`Screenshot capture requested for user ${userId} by admin ${req.user?._id || 'unknown'}`);

            res.json({ 
                success: true, 
                message: 'Screenshot capture request sent to user device' 
            });
        } catch (socketError) {
            logger.error('Failed to send screenshot capture event:', socketError);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to communicate with user device. User may be offline.' 
            });
        }
    } catch (error) {
        logger.error('Error requesting screenshot capture:', error);
        next(error);
    }
};

/**
 * Get screenshots for a user within a date range
 */
exports.getUserScreenshots = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate, limit = 50 } = req.query;

        // TODO: Implement screenshot retrieval from database/storage
        // This would query a Screenshots collection filtered by userId and date range
        
        res.json({ 
            success: true, 
            data: [],
            message: 'Screenshot retrieval not yet implemented' 
        });
    } catch (error) {
        logger.error('Error fetching screenshots:', error);
        next(error);
    }
};
