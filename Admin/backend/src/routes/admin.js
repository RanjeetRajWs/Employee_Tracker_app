const router = require('express').Router();
const adminController = require('../controllers/adminController');
const analyticsController = require('../controllers/analyticsController');
const settingsController = require('../controllers/settingsController');
const sessionsController = require('../controllers/sessionsController');
const activityController = require('../controllers/activityController');
const reportsController = require('../controllers/reportsController');
const userController = require('../controllers/userController');
const breakController = require('../controllers/breakController');
const attendanceController = require('../controllers/attendanceController');
const screenshotsController = require('../controllers/screenshotsController');
const leaveController = require('../controllers/leaveController');
const User = require('../models/user');
const logger = require('../config/logger');
const { logLogin, logSessionUpload } = require('../middleware/activityLogger');
const { registerRules, createUserRules, loginRules, updateProfileRules, changePasswordRules, resetPasswordRules, confirmResetPasswordRules, handleValidation } = require('../middleware/validators/authValidators');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { authLimiter, registerLimiter, sessionUploadLimiter } = require('../middleware/rateLimiter');
const { getIO } = require('../sockets/socketManager');


// Health check endpoint for Electron app to verify backend connectivity
router.get('/health', async (req, res) => {
    const healthCheck = require('../utils/healthCheck');
    const health = await healthCheck.getSystemHealth();

    res.json({
        success: true,
        ...health
    });
});

// ============================================
// Public Routes (Authentication)
// ============================================

// Register - with strict rate limiting
router.post('/register', registerLimiter, registerRules, handleValidation, adminController.registerAdmin);

// Login - with rate limiting to prevent brute force
router.post('/login', authLimiter, loginRules, handleValidation, adminController.login);

// Password Reset Request
router.post('/password-reset/request', authLimiter, resetPasswordRules, handleValidation, adminController.requestPasswordReset);

// Password Reset Confirm
router.post('/password-reset/confirm', authLimiter, confirmResetPasswordRules, handleValidation, adminController.confirmPasswordReset);

// ============================================
// Protected Routes (Require Authentication)
// ============================================

// Get current logged in admin profile
router.get('/me', authenticateToken, adminController.getProfile);

// Update current logged in admin profile
router.put('/me', authenticateToken, adminController.updateProfile);

// Change password
router.post('/change-password', authenticateToken, changePasswordRules, handleValidation, adminController.changePassword);

// Token refresh endpoint - allows users to get a new token even after expiration
router.post('/refresh-token', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || req.headers.Authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Missing Authorization header' });
        }

        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';
        
        // Use constants for expiration
        const { JWT_CONFIG } = require('../constants');
        const JWT_EXPIRES_IN = JWT_CONFIG.EXPIRES_IN;

        // Verify token but ignore expiration - this allows refreshing an expired token
        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
        } catch (e) {
            return res.status(401).json({ success: false, message: 'Invalid token' });
        }

        if (!payload || !payload.id) {
            return res.status(401).json({ success: false, message: 'Invalid token payload' });
        }

        // Verify user still exists and is active
        const adminModel = require('../models/admin');
        const User = require('../models/user');
        let user = await adminModel.findById(payload.id);
        if (!user) {
            user = await User.findById(payload.id);
        }

        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'User not found or inactive' });
        }

        const newToken = jwt.sign(
            {
                id: user._id.toString(),
                role: user.role,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            data: {
                token: newToken,
                expiresIn: JWT_EXPIRES_IN
            },
            message: 'Token refreshed successfully'
        });
    } catch (error) {
        logger.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token'
        });
    }
});

// ============================================
// Analytics Routes (Admin/Superadmin Only)
// ============================================

// Get dashboard statistics
router.get('/analytics/stats', authenticateToken, authorizeRoles('superadmin', 'admin'), analyticsController.getDashboardStats);

// Get user activity analytics
router.get('/analytics/activity', authenticateToken, authorizeRoles('superadmin', 'admin'), analyticsController.getUserActivity);

// Get user productivity analytics - users can access their own, admins can access any
router.get('/analytics/productivity/:userId', authenticateToken, async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        // Allow users to access their own data, or admins to access any user's data
        if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.id !== userId) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const query = { userId };
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = startDate;
            if (endDate) query.date.$lte = endDate;
        }

        const Session = require('../models/session');
        const sessions = await Session.find(query);

        // Calculate productivity metrics
        const totalWorkingTime = sessions.reduce((sum, s) => sum + (s.workingTime || 0), 0);
        const totalIdleTime = sessions.reduce((sum, s) => sum + (s.idleTime || 0), 0);
        const totalTime = totalWorkingTime + totalIdleTime;
        const productivityPercentage = totalTime > 0 ? (totalWorkingTime / totalTime) * 100 : 0;

        const analytics = {
            userId,
            period: { startDate, endDate },
            totalSessions: sessions.length,
            totalWorkingTime,
            totalIdleTime,
            totalTime,
            productivityPercentage: productivityPercentage.toFixed(2),
            averageSessionTime: sessions.length > 0 ? (totalTime / sessions.length).toFixed(2) : 0,
        };

        res.json({
            success: true,
            data: analytics
        });
    } catch (error) {
        next(error);
    }
});

// ============================================
// Settings Routes (Admin/Superadmin Only)
// ============================================

// Get application settings (accessible to all authenticated users)
router.get('/settings', settingsController.getSettings);

// Update application settings
router.put('/settings', authenticateToken, authorizeRoles('superadmin', 'admin'), settingsController.updateSettings);

// Reset settings to defaults
router.post('/settings/reset', authenticateToken, authorizeRoles('superadmin', 'admin'), settingsController.resetSettings);

// ============================================
// User Management Routes (Admin/Superadmin Only)
// ============================================

// Get all users (with pagination and filters)
router.get('/users', authenticateToken, authorizeRoles('superadmin', 'admin'), userController.getAllUsers);

// Create new user (Employee)
router.post('/users', authenticateToken, authorizeRoles('superadmin', 'admin'), createUserRules, handleValidation, userController.createUser);

// Get user by ID
router.get('/users/:id', authenticateToken, authorizeRoles('superadmin', 'admin'), userController.getUserById);

// Update user
router.put('/users/:id', authenticateToken, authorizeRoles('superadmin', 'admin'), updateProfileRules, handleValidation, userController.updateUser);

// Delete user (soft delete)
router.delete('/users/:id', authenticateToken, authorizeRoles('superadmin', 'admin'), userController.deleteUser);

// ============================================
// Employee Authentication Routes (Public)
// ============================================

// Authenticate employee user (for Employee Tracker login)
router.post('/users/authenticate', authLimiter, logLogin, userController.authenticateUser);

// Change employee password (for Employee Tracker) - requires authentication
router.put('/users/change-password', authenticateToken, userController.changeUserPassword);

// Get employee status (for Employee Tracker)
router.get('/users/status/:userId', userController.getUserStatus);

// ============================================
// Break Requests Routes
// ============================================

// Submit a break request (Employee App)
router.post('/breaks/request', breakController.requestBreak);

// Get pending break requests (Admin Panel)
router.get('/breaks/pending', authenticateToken, authorizeRoles('superadmin', 'admin'), breakController.getPendingBreaks);
router.get('/breaks/all', authenticateToken, authorizeRoles('superadmin', 'admin'), breakController.getAllBreaks);

// Process a break request (Admin Panel)
router.patch('/breaks/:id/process', authenticateToken, authorizeRoles('superadmin', 'admin'), breakController.processBreakRequest);

// ============================================
// Attendance Routes
// ============================================

// Clock in (Employee App)
router.post('/attendance/clock-in', attendanceController.clockIn);

// Clock out (Employee App)
router.post('/attendance/clock-out', attendanceController.clockOut);

// Submit early clock-out request (Employee App)
router.post('/attendance/clock-out-request', attendanceController.clockOutRequest);

// Get today's attendance (Admin Panel)
router.get('/attendance/today', authenticateToken, attendanceController.getAttendanceToday);

// Get attendance by date range (Admin Panel)
router.get('/attendance/range', authenticateToken, authorizeRoles('superadmin', 'admin'), attendanceController.getAttendanceByDateRange);

// Get clock-out requests (Admin Panel)
router.get('/attendance/clock-out-requests', authenticateToken, attendanceController.getClockOutRequests);

// Process clock-out request (Admin Panel - approve/reject)
router.put('/attendance/clock-out-requests/:requestId', authenticateToken, authorizeRoles('superadmin', 'admin'), attendanceController.processClockOutRequest);

// Get current attendance status (Employee App)
router.get('/attendance/status/:userId', attendanceController.getAttendanceStatus);

// Get user attendance history (Admin Panel/Employee App)
router.get('/attendance/user/:userId', authenticateToken, attendanceController.getUserAttendance);

// ============================================
// Screenshots Routes (Admin Only)
// ============================================

// Manually trigger screenshot capture for a user
router.post('/screenshots/capture', authenticateToken, authorizeRoles('superadmin', 'admin'), screenshotsController.captureScreenshot);

// Get user screenshots
router.get('/screenshots/user/:userId', authenticateToken, screenshotsController.getUserScreenshots);

// ============================================
// Leave Management Routes (Admin Only)
// ============================================

// Get all leave requests
router.get('/leaves', authenticateToken, authorizeRoles('superadmin', 'admin'), leaveController.getAllLeavesAdmin);

// Process a leave request (Approve/Reject)
router.patch('/leaves/:id', authenticateToken, authorizeRoles('superadmin', 'admin'), leaveController.updateLeaveStatus);

// ============================================
// Sessions Routes (Admin/Superadmin Only)
// ============================================

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Otherwise /sessions/:id will match everything like /sessions/stats, /sessions/daily, etc.

// Get session statistics
router.get('/sessions/stats', authenticateToken, authorizeRoles('superadmin', 'admin'), sessionsController.getSessionStats);

// Get daily sessions report (alternative route)
router.get('/sessions/day/:userId', authenticateToken, async (req, res, next) => {
    const { userId } = req.params;
    logger.debug('Fetching daily sessions:', { userId });
    const { date } = req.query;

    // Allow users to access their own data, or admins to access any user's data
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    req.params.date = targetDate;
    reportsController.getDailyReport(req, res, next);
});

// Get weekly sessions report (alternative route)
router.get('/sessions/week/:userId', authenticateToken, async (req, res, next) => {
    const { userId } = req.params;
    const { startDate } = req.query;

    // Allow users to access their own data, or admins to access any user's data
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const targetDate = startDate || new Date().toISOString().split('T')[0];
    req.params.date = targetDate;
    reportsController.getWeeklyReport(req, res, next);
});

// Get monthly sessions report (alternative route)
router.get('/sessions/month/:userId', authenticateToken, async (req, res, next) => {
    const { userId } = req.params;
    const { month, year } = req.query;

    // Allow users to access their own data, or admins to access any user's data
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const now = new Date();
    req.params.month = month || (now.getMonth() + 1).toString();
    req.params.year = year || now.getFullYear().toString();
    reportsController.getMonthlyReport(req, res, next);
});

// Get user sessions
router.get('/sessions/user/:userId', authenticateToken, async (req, res, next) => {
    const { userId } = req.params;

    // Allow users to access their own data, or admins to access any user's data
    if (req.user.role !== 'superadmin' && req.user.role !== 'admin' && req.user.id !== userId) {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }

    req.query.userId = req.params.userId;
    sessionsController.getAllSessions(req, res, next);
});


// ============================================
// Activity Logs Routes
// ============================================

// Create activity log (for Electron App)
router.post('/activity-logs',
    async (req, res, next) => {
        try {
            const { userId, action, details, timestamp,userName } = req.body;

            if (!userId || !action) {
                return res.status(400).json({ success: false, error: 'userId and action are required' });
            }

            const ActivityLog = require('../models/activityLog');
            const log = await ActivityLog.create({ userId,userName, activityType: action, metadata: details || {}, timestamp: timestamp || new Date() });
            res.json({ success: true, data: log });
        } catch (error) {
            logger.error('Error creating activity log:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
);

// Get activity logs (Admin only)
router.get('/activity-logs', authenticateToken, authorizeRoles('superadmin', 'admin'), activityController.getActivityLogs);

// Get activity statistics
router.get('/activity-logs/stats', authenticateToken, authorizeRoles('superadmin', 'admin'), activityController.getActivityStats);

// Helper to save base64 image
const fs = require('fs');
const path = require('path');

function saveBase64Image(base64Data, userId) {
    try {
        // Check if it's a data URI
        if (!base64Data || typeof base64Data !== 'string' || !base64Data.startsWith('data:image')) return base64Data; // Return as is if not base64 data URI

        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return base64Data;

        const buffer = Buffer.from(matches[2], 'base64');
        const fileName = `screenshot_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
        const uploadDir = path.join(__dirname, '../../uploads/screenshots');

        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

        fs.writeFileSync(path.join(uploadDir, fileName), buffer);
        return `/uploads/screenshots/${fileName}`; // Return relative path
    } catch (e) {
        logger.error('Failed to save screenshot:', e);
        return null;
    }
}

// Upload session data (accessible without auth for Employee Tracker)
// This endpoint receives tracking data from the Electron app
router.post('/sessions/upload', sessionUploadLimiter, async (req, res, next) => {
    try {
        const sessionData = req.body;

        // Validate required fields
        if (!sessionData.userId) {
            return res.status(400).json({ success: false, error: 'userId is required' });
        }

        // Update lastActive for the user
        try {
            await User.findByIdAndUpdate(sessionData.userId, { lastActive: new Date() });
        } catch (err) {
            logger.error(`Error updating lastActive for user ${sessionData.userId}:`, err);
        }

        // Validate data types
        if (typeof sessionData.workingTime !== 'undefined' && typeof sessionData.workingTime !== 'number') {
            return res.status(400).json({ success: false, error: 'workingTime must be a number' });
        }

        if (typeof sessionData.idleTime !== 'undefined' && typeof sessionData.idleTime !== 'number') {
            return res.status(400).json({ success: false, error: 'idleTime must be a number' });
        }

        // Validate date format if provided (YYYY-MM-DD)
        if (sessionData.date && !/^\d{4}-\d{2}-\d{2}$/.test(sessionData.date)) {
            return res.status(400).json({ success: false, error: 'Invalid date format. Use YYYY-MM-DD' });
        }

        // Sanitize and validate arrays
        if (sessionData.screenshots && !Array.isArray(sessionData.screenshots)) {
            return res.status(400).json({ success: false, error: 'screenshots must be an array' });
        }

        if (sessionData.breakDetails && !Array.isArray(sessionData.breakDetails)) {
            return res.status(400).json({ success: false, error: 'breakDetails must be an array' });
        }

        // Transform screenshots: Save base64 to file if present
        const processedScreenshots = (sessionData.screenshots || []).map(screenshot => {
            let url = screenshot.url || screenshot.path || '';

            // If data property exists (from Electron app), try to save it
            if (screenshot.data) {
                const savedPath = saveBase64Image(screenshot.data, sessionData.userId);
                if (savedPath) url = savedPath;
            }

            return { path: url, timestamp: screenshot.timestamp || Date.now(), url: url };
        });

        // Transform and prepare session data for database
        const processedDate = sessionData.date || new Date(sessionData.sessionStart || Date.now()).toISOString().split('T')[0];
        const processedStart = sessionData.sessionStart ? new Date(sessionData.sessionStart) : new Date();

        // Find existing session or create new one (upsert)
        const Session = require('../models/session');
        const ActivityLog = require('../models/activityLog');
        
        let session = await Session.findOne({
            userId: sessionData.userId,
            sessionStart: processedStart
        });

        let deltaWorking = sessionData.workingTime || 0;
        let deltaIdle = sessionData.idleTime || 0;

        if (session) {
            // Calculate deltas if session already existed
            // (Assuming Electron sends cumulative totals for the session)
            deltaWorking = Math.max(0, (sessionData.workingTime || 0) - (session.workingTime || 0));
            deltaIdle = Math.max(0, (sessionData.idleTime || 0) - (session.idleTime || 0));

            // Update existing session
            session.workingTime = sessionData.workingTime || session.workingTime;
            session.idleTime = sessionData.idleTime || session.idleTime;
            session.sessionEnd = sessionData.sessionEnd ? new Date(sessionData.sessionEnd) : null;
            session.isActive = !sessionData.sessionEnd;
            session.screenshotCount = sessionData.totalScreenshotCount || sessionData.screenshotCount || (session.screenshotCount + processedScreenshots.length);
            
            // Append new screenshots and breaks
            if (processedScreenshots.length > 0) {
                // Ensure no duplicates by timestamp if possible
                const existingTs = new Set(session.screenshots.map(s => s.timestamp));
                const uniqueNew = processedScreenshots.filter(s => !existingTs.has(s.timestamp));
                session.screenshots.push(...uniqueNew);
            }
            
            // Handle activity metrics - update to latest
            if (sessionData.activityMetrics) {
                session.activityMetrics = sessionData.activityMetrics;
            }

            // Handle application usage - merge durations
            if (sessionData.applications && Array.isArray(sessionData.applications)) {
                const incomingApps = sessionData.applications;
                const existingApps = session.applications || [];

                incomingApps.forEach(incomingApp => {
                    const existingAppIndex = existingApps.findIndex(a => a.name === incomingApp.name);
                    if (existingAppIndex > -1) {
                        // Merge: update duration (assuming Electron sends cumulative for this upload)
                        // Actually, if Electron sends cumulative session totals, we should just replace
                        // But the safest is to follow the same logic as workingTime (replace with latest)
                        existingApps[existingAppIndex].duration = incomingApp.duration;
                        existingApps[existingAppIndex].lastActive = incomingApp.lastActive || new Date();
                    } else {
                        existingApps.push(incomingApp);
                    }
                });
                session.applications = existingApps;
            }
            
            await session.save();
            logger.info(`Updated session ${session._id} for user ${sessionData.userId}`);
        } else {
            // Create new session
            const preparedData = {
                userId: sessionData.userId,
                userName: sessionData.userName,
                sessionStart: processedStart,
                sessionEnd: sessionData.sessionEnd ? new Date(sessionData.sessionEnd) : null,
                workingTime: sessionData.workingTime || 0,
                idleTime: sessionData.idleTime || 0,
                screenshotCount: sessionData.totalScreenshotCount || sessionData.screenshotCount || processedScreenshots.length,
                breaksTaken: (sessionData.breakDetails?.length || sessionData.breaks?.length || 0),
                date: processedDate,
                screenshots: processedScreenshots,
                breakDetails: (sessionData.breakDetails || sessionData.breaks || []).map(breakItem => {
                    const startTime = breakItem.startTime || breakItem.start
                        ? (typeof breakItem.start === 'string' || breakItem.start instanceof Date
                            ? new Date(breakItem.start).getTime()
                            : breakItem.startTime || breakItem.start)
                        : Date.now();
                    const endTime = breakItem.endTime || breakItem.end
                        ? (typeof breakItem.end === 'string' || breakItem.end instanceof Date
                            ? new Date(breakItem.end).getTime()
                            : breakItem.endTime || breakItem.end)
                        : Date.now();
                    return { startTime, endTime, duration: breakItem.duration || (endTime - startTime), type: breakItem.type || 'manual' };
                }),
                isActive: !sessionData.sessionEnd,
                activityMetrics: sessionData.activityMetrics || {
                    keyPresses: 0,
                    mouseClicks: 0,
                    mouseMovements: 0,
                    mouseScrolls: 0
                },
                applications: sessionData.applications || []
            };
            session = await Session.create(preparedData);
            logger.info(`Created new session ${session._id} for user ${sessionData.userId}`);
        }
        
        // Create meaningful activity logs for the timeline using DELTAS
        const logPromises = [];
        
        if (deltaWorking > 0) {
            logPromises.push(ActivityLog.create({
                userId: sessionData.userId,
                userName: sessionData.userName,
                sessionId: session._id,
                activityType: 'active',
                timestamp: new Date(),
                duration: deltaWorking * 1000, // ms
                metadata: { source: 'session-upload', incremental: !!session }
            }));
        }
        
        if (deltaIdle > 0) {
            logPromises.push(ActivityLog.create({
                userId: sessionData.userId,
                userName: sessionData.userName,
                sessionId: session._id,
                activityType: 'idle',
                timestamp: new Date(),
                duration: deltaIdle * 1000, // ms
                metadata: { source: 'session-upload', incremental: !!session }
            }));
        }
        
        if (logPromises.length > 0) {
            await Promise.all(logPromises);
        }

        logger.info(`Session processing complete for user ${sessionData.userId}`);

        // Emit attendance update to refresh UI
        try {
            const io = getIO();
            io.emit('attendance-update', {
                type: 'session-upload',
                userId: sessionData.userId,
                timestamp: new Date()
            });
        } catch (ioError) {
            logger.error('Socket emission failed:', ioError);
        }

        // Return success response with essential data
        res.json({
            success: true, message: 'Session uploaded and processed successfully', data: {
                sessionId: session._id,
                userId: session.userId,
                date: session.date,
                workingTime: session.workingTime,
                idleTime: session.idleTime,
                screenshotCount: session.screenshotCount,
                isActive: session.isActive
            }
        });
    } catch (error) {
        logger.error('Error uploading session:', error);
        res.status(500).json({ success: false, error: 'Failed to upload session', details: error.message, timestamp: new Date().toISOString() });
    }
}
);

// Add session (alternative to upload)
router.post('/sessions', authenticateToken, authorizeRoles('superadmin', 'admin', 'user'), async (req, res, next) => {
    try {
        const sessionData = req.body;
        const session = await require('../models/session').create(sessionData);
        res.json({ success: true, message: 'Session created successfully', data: session });
    } catch (error) {
        logger.error('Error creating session:', error);
        next(error);
    }
}
);

// Get all sessions (must be before /sessions/:id to avoid conflicts)
router.get('/sessions', authenticateToken, authorizeRoles('superadmin', 'admin'), sessionsController.getAllSessions);

// Get session by ID (MUST BE LAST among /sessions routes)
router.get('/sessions/:id', authenticateToken, authorizeRoles('superadmin', 'admin'), sessionsController.getSessionById);

// ============================================
// Reports Routes (Admin/Superadmin Only)
// ============================================

// Get daily report
router.get('/reports/daily/:userId/:date', authenticateToken, authorizeRoles('superadmin', 'admin'), reportsController.getDailyReport);

// Get weekly report
router.get('/reports/weekly/:userId/:date', authenticateToken, authorizeRoles('superadmin', 'admin'), reportsController.getWeeklyReport);

// Get monthly report
router.get('/reports/monthly/:userId/:month/:year', authenticateToken, authorizeRoles('superadmin', 'admin'), reportsController.getMonthlyReport);

// ============================================
// Maintenance Routes (Superadmin Only)
// ============================================

const sessionCleanup = require('../utils/sessionCleanup');

// Get storage statistics
router.get('/maintenance/storage-stats', authenticateToken, authorizeRoles('superadmin'), async (req, res) => {
    try {
        const stats = await sessionCleanup.getStorageStats();
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting storage stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get storage statistics'
        });
    }
});

// Run cleanup
router.post('/maintenance/cleanup', authenticateToken, authorizeRoles('superadmin'), async (req, res) => {
    try {
        const { daysOld = 90 } = req.body;
        const screenshotsDir = path.join(__dirname, '../../uploads/screenshots');

        const results = await sessionCleanup.runFullCleanup({
            daysOld,
            screenshotsDir
        });

        res.json({
            success: true,
            data: results,
            message: 'Cleanup completed successfully'
        });
    } catch (error) {
        logger.error('Error running cleanup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to run cleanup'
        });
    }
});

module.exports = router;