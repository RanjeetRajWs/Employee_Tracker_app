const Leave = require('../models/leave');
const User = require('../models/user');
const logger = require('../config/logger');

// Calculate available leaves
const calculateLeaveBalance = async (userId) => {
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // Accrued annual leaves: 1 per month from January (always start from Jan 0)
    // Example: Feb (1) - Jan (0) + 1 = 2 leaves
    const accrued = currentMonth + 1; 
    
    // Get used leaves for this year (Approved + Pending)
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

    const leaves = await Leave.find({
        userId,
        status: { $in: ['Approved', 'Pending'] },
        fromDate: { $gte: startOfYear, $lte: endOfYear }
    });

    let annualUsed = 0;
    let compOffUsed = 0;

    leaves.forEach(leave => {
        let days = 0;
        if (leave.isHalfDay) {
            days = 0.5;
        } else {
            const diffTime = Math.abs(new Date(leave.toDate) - new Date(leave.fromDate));
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        }

        if (leave.leaveType === 'Annual') {
            annualUsed += days;
        } else if (leave.leaveType === 'Comp Off') {
            compOffUsed += days;
        }
    });

    return {
        annual: {
            accrued,
            used: annualUsed,
            available: Math.max(0, accrued - annualUsed),
            totalYearly: 12
        },
        compOff: {
            total: user.compOffBalance || 0,
            used: compOffUsed,
            available: Math.max(0, (user.compOffBalance || 0) - compOffUsed)
        }
    };
};

exports.getLeaveBalance = async (req, res) => {
    try {
        const balance = await calculateLeaveBalance(req.user.id);
        res.json({ success: true, data: balance });
    } catch (error) {
        logger.error(`Error getting leave balance: ${error.message}`);
        res.status(500).json({ success: false, error: 'Failed to fetch leave balance' });
    }
};

exports.applyLeave = async (req, res) => {
    try {
        const { leaveType, fromDate, toDate, isHalfDay, reason, document } = req.body;
        const userId = req.user.id;

        // Validation
        if (!fromDate || !leaveType || !reason) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const start = new Date(fromDate);
        const end = isHalfDay ? start : new Date(toDate);

        if (end < start) {
            return res.status(400).json({ success: false, error: 'End date cannot be before start date' });
        }

        const balance = await calculateLeaveBalance(userId);
        let requestedDays = 0;
        if (isHalfDay) {
            requestedDays = 0.5;
        } else {
            const diffTime = Math.abs(end - start);
            requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        // Check balance
        if (leaveType === 'Annual') {
            if (balance.annual.available < requestedDays) {
                 return res.status(400).json({ success: false, error: `Insufficient annual leave balance. Available: ${balance.annual.available}, Requested: ${requestedDays}` });
            }
        } else if (leaveType === 'Comp Off') {
            if (balance.compOff.available < requestedDays) {
                return res.status(400).json({ success: false, error: `Insufficient comp off balance. Available: ${balance.compOff.available}, Requested: ${requestedDays}` });
            }
        }

        const leave = new Leave({
            userId,
            leaveType,
            fromDate: start,
            toDate: end,
            isHalfDay,
            reason,
            document: req.file ? req.file.path : undefined,
            status: 'Pending'
        });

        await leave.save();

        res.status(201).json({ success: true, message: 'Leave application submitted successfully', data: leave });

    } catch (error) {
        logger.error(`Error applying leave: ${error.message}`);
        res.status(500).json({ success: false, error: 'Failed to apply leave' });
    }
};

exports.getMyLeaves = async (req, res) => {
    try {
        const { filter } = req.query; // week, month, year
        const userId = req.user.id;

        let dateQuery = {};
        const now = new Date();
        
        if (filter === 'week') {
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            dateQuery = { fromDate: { $gte: startOfWeek } };
        } else if (filter === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            dateQuery = { fromDate: { $gte: startOfMonth } };
        } else if (filter === 'year') {
            const startOfYear = new Date(now.getFullYear(), 0, 1);
            dateQuery = { fromDate: { $gte: startOfYear } };
        }

        const leaves = await Leave.find({ userId, ...dateQuery }).sort({ createdAt: -1 });

        res.json({ success: true, data: leaves });
    } catch (error) {
        logger.error(`Error fetching leaves: ${error.message}`);
        res.status(500).json({ success: false, error: 'Failed to fetch leaves' });
    }
};

// Admin: Get all leave requests
exports.getAllLeavesAdmin = async (req, res) => {
    try {
        const { status, leaveType, userId } = req.query;
        let query = {};
        if (status) query.status = status;
        if (leaveType) query.leaveType = leaveType;
        if (userId) query.userId = userId;

        const leaves = await Leave.find(query)
            .populate('userId', 'username email')
            .sort({ createdAt: -1 });

        res.json({ success: true, data: leaves });
    } catch (error) {
        logger.error(`Error fetching all leaves for admin: ${error.message}`);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
};

// Admin: Approve or Reject Leave
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminComment, rejectionReason } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const leave = await Leave.findById(id);
        if (!leave) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }

        leave.status = status;
        if (adminComment) leave.adminComment = adminComment;
        if (rejectionReason) leave.rejectionReason = rejectionReason;

        await leave.save();

        res.json({ success: true, message: `Leave ${status.toLowerCase()} successfully`, data: leave });
    } catch (error) {
        logger.error(`Error updating leave status: ${error.message}`);
        res.status(500).json({ success: false, error: 'Failed to update leave status' });
    }
};
