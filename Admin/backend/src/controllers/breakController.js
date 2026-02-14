const BreakRequest = require('../models/breakRequest');
const User = require('../models/user');
const { getIO } = require('../sockets/socketManager');
const logger = require('../config/logger');

exports.requestBreak = async (req, res) => {
    try {
        const { userId, userName, startTime, endTime, reason } = req.body;

        if (!userId || !startTime || !endTime || !reason) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const start = new Date(startTime);
        const end = new Date(endTime);
        const duration = Math.round((end - start) / (1000 * 60));

        if (duration <= 0) {
            return res.status(400).json({ success: false, error: 'End time must be after start time' });
        }

        const breakRequest = await BreakRequest.create({
            userId,
            userName,
            startTime: start,
            endTime: end,
            duration,
            reason
        });
        
        try {
            const io = getIO();
            io.to('admin-room').emit('new-break-request', breakRequest);
        } catch (socketErr) {
            console.error('Socket notification failed:', socketErr);
        }

        res.json({ success: true, data: breakRequest });
    } catch (error) {
        console.error('Error requesting break:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPendingBreaks = async (req, res) => {
    try {
        const pendingBreaks = await BreakRequest.find({ status: 'pending' }).sort({ requestedAt: -1 });
        res.json({ success: true, data: pendingBreaks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getAllBreaks = async (req, res) => {
    try {
        const { status, userId, page = 1, limit = 10 } = req.query;
        const query = {};
        if (status && status !== 'all') query.status = status;
        if (userId) query.userId = userId;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const breaks = await BreakRequest.find(query)
            .sort({ requestedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await BreakRequest.countDocuments(query);
        
        const { sendPaginated } = require('../utils/response');
        return sendPaginated(res, breaks, {
            page: parseInt(page),
            limit: parseInt(limit),
            total
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.processBreakRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNotes } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const breakRequest = await BreakRequest.findById(id);
        if (!breakRequest) {
            return res.status(404).json({ success: false, error: 'Break request not found' });
        }

        breakRequest.status = status;
        breakRequest.adminNotes = adminNotes;
        breakRequest.processedAt = new Date();
        await breakRequest.save();

        try {
            const io = getIO();
            if (status === 'approved') {
                io.to('project4-room').emit('break-approved', {
                    userId: breakRequest.userId,
                    startTime: breakRequest.startTime,
                    endTime: breakRequest.endTime,
                    duration: breakRequest.duration,
                    requestId: breakRequest._id
                });
            } else {
                io.to('project4-room').emit('break-rejected', {
                    userId: breakRequest.userId,
                    requestId: breakRequest._id,
                    reason: adminNotes
                });
            }
        } catch (socketErr) {
            console.error('Socket notification failed:', socketErr);
        }

        res.json({ success: true, data: breakRequest });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
