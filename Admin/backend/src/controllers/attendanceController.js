const Attendance = require('../models/attendance');
const User = require('../models/user');
const ClockOutRequest = require('../models/clockOutRequest');
const Settings = require('../models/settings');
const { getIO } = require('../sockets/socketManager');

/**
 * Calculate delay in minutes between actual clock-in time and standard time
 * @param {Date} clockInTime - Actual clock-in time
 * @param {String} workStartTime - Base work start time (e.g. "10:00")
 * @param {String} lateMarkTime - Time after which user is late (e.g. "10:15")
 * @returns {Object} { isDelayed: Boolean, delayMinutes: Number }
 */
const calculateClockInDelay = (clockInTime, workStartTime, lateMarkTime) => {
    const logger = require('../config/logger');
    
    if (!workStartTime || !lateMarkTime) {
        return { isDelayed: false, delayMinutes: 0 };
    }

    // Parse times
    const [startHour, startMinute] = workStartTime.split(':').map(Number);
    const [lateHour, lateMinute] = lateMarkTime.split(':').map(Number);
    
    // Create Date objects for today
    const startDateTime = new Date(clockInTime);
    startDateTime.setHours(startHour, startMinute, 0, 0);
    
    const lateDateTime = new Date(clockInTime);
    lateDateTime.setHours(lateHour, lateMinute, 0, 0);
    
    // Get actual clock-in time
    const actualTime = new Date(clockInTime);
    
    // Check if late (after 10:15)
    if (actualTime > lateDateTime) {
        // Calculate delay from 10:00 (workStartTime)
        const diffMs = actualTime - startDateTime;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        logger.info(`⏰ Late! Standard: ${lateMarkTime}, Start: ${workStartTime}, Actual: ${actualTime.toLocaleTimeString()}, Delay: ${diffMinutes}m`);
        return { isDelayed: true, delayMinutes: diffMinutes };
    }
    
    return { isDelayed: false, delayMinutes: 0 };
};

exports.clockIn = async (req, res, next) => {
    try {
        const { userId, userName, location } = req.body;
        const logger = require('../config/logger');

        logger.info(`📥 Clock-in request received for user: ${userId} (${userName})`);
        logger.info(`📍 Location: ${JSON.stringify(location)}`);

        if (!userId || !location) {
            logger.warn('⚠️ Clock-in failed: Missing userId or location');
            return res.status(400).json({ success: false, error: 'userId and location are required' });
        }

        const today = new Date().toISOString().split('T')[0];
        const clockInTime = new Date();
        logger.info(`📅 Date: ${today}`);

        // Fetch settings
        let settings = await Settings.findOne();
        if (!settings) {
            settings = await Settings.create({});
        }

        const workStartTime = settings.workStartTime || '10:00';
        const standardClockInTime = settings.standardClockInTime || '10:15';
        logger.info(`⏰ Schedule: Start ${workStartTime}, Late after ${standardClockInTime}`);

        // Calculate delay logic (only for the first clock-in of the day)
        // We will determine if we need to set this later
        const delayInfo = calculateClockInDelay(clockInTime, workStartTime, standardClockInTime);
        const { isDelayed, delayMinutes } = delayInfo;

        // Find existing attendance document for today
        let attendance = await Attendance.findOne({ userId, date: today });

        if (!attendance) {
            // Case 1: First clock-in of the day
            if (isDelayed) {
                logger.warn(`⚠️ DELAYED CLOCK-IN: ${delayMinutes} minutes late!`);
            } else {
                logger.info(`✅ ON-TIME CLOCK-IN`);
            }

            attendance = new Attendance({
                userId,
                userName,
                date: today,
                timestamp: clockInTime,
                isDelayed,           // Only set on first clock-in
                delayMinutes,        // Only set on first clock-in
                startWorkTime: workStartTime, // Helpful to store what setting was used
                clockIN_out: {
                    attend: [{
                        clockIn: {
                            time: clockInTime,
                            location
                        },
                        clockOut: {
                            time: null,
                            location: { latitude: 0, longitude: 0, address: '' } // Placeholder as per schema requirement
                        },
                        workDuration: 0
                    }]
                },
                status: 'Present'
            });
            await attendance.save();

        } else {
            // Case 2: Subsequent clock-in (e.g., after a break or earlier clock-out)
            logger.info(`🔄 Subsequent Clock-In for today`);
            
            // Check if user is already clocked in (last session has no clockOut time)
            const sessions = attendance.clockIN_out.attend;
            const lastSession = sessions[sessions.length - 1];
            
            if (lastSession && (!lastSession.clockOut || !lastSession.clockOut.time)) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Already clocked in. Please clock out first.' 
                });
            }

            // Push new session
            attendance.clockIN_out.attend.push({
                clockIn: {
                    time: clockInTime,
                    location
                },
                clockOut: {
                    time: null,
                    location: { latitude: 0, longitude: 0, address: '' }
                },
                workDuration: 0
            });
            
            attendance.status = 'Present'; // Update status to Present
            attendance.timestamp = clockInTime; // Update last activity timestamp
            await attendance.save();
        }

        logger.info(`✅ Attendance record updated: ${attendance._id} (type: clock-in)`);

        // Update user's current status
        const userUpdate = await User.findByIdAndUpdate(userId, { 
            isClockedIn: true,
            lastClockIn: clockInTime
        }, { new: true });

        logger.info(`✅ User status updated: isClockedIn=true for user ${userId}`);

        try {
            const io = getIO();
            io.to('admin-room').emit('attendance-update', { 
                type: 'clock-in', 
                data: attendance,
                userId,
                userName,
                isDelayed: attendance.isDelayed
            });
        } catch (socketError) {
            const logger = require('../config/logger');
            logger.error('❌ Socket emit error:', socketError);
        }

        res.json({  
            success: true, 
            data: attendance,
            delayInfo: isDelayed ? {
                isDelayed: true,
                delayMinutes,
                message: `You are ${delayMinutes} minutes late. Standard time is ${standardClockInTime}.`
            } : {
                isDelayed: false,
                message: 'On time!'
            }
        });
    } catch (error) {
        const logger = require('../config/logger');
        logger.error('❌ Error clocking in:', error);
        next(error);
    }
};

exports.clockOut = async (req, res, next) => {
    try {
        const { userId, userName, location } = req.body;
        const logger = require('../config/logger');

        logger.info(`📤 Clock-out request received for user: ${userId} (${userName})`);
        logger.info(`📍 Location: ${JSON.stringify(location)}`);

        if (!userId || !location) {
            logger.warn('⚠️ Clock-out failed: Missing userId or location');
            return res.status(400).json({ success: false, error: 'userId and location are required' });
        }

        const today = new Date().toISOString().split('T')[0];
        const clockOutTime = new Date();
        logger.info(`📅 Date: ${today}`);

        // Find associated attendance record for today
        const attendance = await Attendance.findOne({
            userId,
            date: today
        });

        if (!attendance) {
             logger.warn('⚠️ No attendance record found for today!');
             return res.status(400).json({ success: false, error: 'No attendance record found. Please clock in first.' });
        }

        // Get sessions info
        const sessions = attendance.clockIN_out.attend;
        if (!sessions || sessions.length === 0) {
            return res.status(400).json({ success: false, error: 'No active session found.' });
        }

        // Get the latest session
        const currentSession = sessions[sessions.length - 1];

        // Check if already clocked out
        if (currentSession.clockOut && currentSession.clockOut.time) {
             return res.status(400).json({ success: false, error: 'Already clocked out for the current session.' });
        }

        // --- Logic for Clock-Out ---
        
        // Update the current session with clockOut details
        currentSession.clockOut = {
            time: clockOutTime,
            location
        };

        // Calculate duration for this session (ms)
        const sessionDuration = clockOutTime - new Date(currentSession.clockIn.time);
        currentSession.workDuration = sessionDuration;

        // Calculate TOTAL work duration for the day (sum of all sessions)
        const totalDuration = sessions.reduce((sum, s) => {
            // For the current session, we just set workDuration. 
            // Previous sessions should already have it.
            return sum + (s.workDuration || 0); 
        }, 0); // Note: currentSession is reference to object in array, so it is included with updated value

        attendance.totalWorkDuration = totalDuration;

        // Calculate Overtime / Partial Status
        // Get settings for work hours (default 8h)
        const settings = await Settings.findOne();
        const minWorkHours = settings?.minWorkHours || 8;
        const minWorkMs = minWorkHours * 60 * 60 * 1000;

        let status = 'Partially Completed';
        let overtime = 0;

        if (totalDuration >= minWorkMs) {
            status = 'Completed Work';
            overtime = totalDuration - minWorkMs;
        } else {
            status = 'Partially Completed';
        }

        attendance.status = status;
        attendance.overtime = overtime;
        attendance.timestamp = clockOutTime; // Update last modified time

        await attendance.save();

        logger.info(`✅ Attendance record updated: ${attendance._id} (type: clock-out, status: ${status})`);
        logger.info(`⏱️ Total Duration: ${(totalDuration/1000/60).toFixed(1)}m, Status: ${status}`);

        // Update user's current status
        const userUpdate = await User.findByIdAndUpdate(userId, { 
            isClockedIn: false,
            lastClockOut: clockOutTime
        }, { new: true });
        
        // Clear any pending clock-out requests if necessary
        // (Optional: if we want to auto-resolve requests upon actual clock out)

        try {
            const io = getIO();
            io.to('admin-room').emit('attendance-update', { 
                type: 'clock-out', 
                data: attendance,
                userId,
                userName
            });
        } catch (socketError) {
             // ...
        }

        res.json({
            success: true,
            data: attendance,
            message: `Clocked out successfully. Duration: ${(sessionDuration/1000/60).toFixed(0)}m. Total: ${(totalDuration/1000/60).toFixed(0)}m.`
        });
    } catch (error) {
        const logger = require('../config/logger');
        logger.error('❌ Error clocking out:', error);
        next(error);
    }
};

exports.getAttendanceStatus = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const logger = require('../config/logger');
        const today = new Date().toISOString().split('T')[0];

        logger.info(`🔍 Fetching attendance status for user: ${userId} on ${today}`);

        // Get daily attendance document
        const dailyRecord = await Attendance.findOne({ userId, date: today });
        
        let isClockedIn = false;
        let clockInTime = null;
        let clockInLocation = null;
        let timeline = [];
        let status = 'Absent';

        if (dailyRecord) {
            const sessions = dailyRecord.clockIN_out?.attend || [];
            
            // Build timeline for frontend/tracker consumption
            sessions.forEach(session => {
                if (session.clockIn && session.clockIn.time) {
                    timeline.push({
                        type: 'clock-in',
                        timestamp: session.clockIn.time,
                        location: session.clockIn.location
                    });
                }
                if (session.clockOut && session.clockOut.time) {
                    timeline.push({
                        type: 'clock-out',
                        timestamp: session.clockOut.time,
                        location: session.clockOut.location
                    });
                }
            });

            // Determine current clock-in status
            if (sessions.length > 0) {
                const lastSession = sessions[sessions.length - 1];
                if (lastSession.clockIn && (!lastSession.clockOut || !lastSession.clockOut.time)) {
                    isClockedIn = true;
                    clockInTime = new Date(lastSession.clockIn.time).getTime();
                    clockInLocation = lastSession.clockIn.location;
                }
            }

            status = dailyRecord.status || (isClockedIn ? 'Present' : 'Absent');
        }

        const response = {
            success: true,
            data: {
                isClockedIn,
                lastStatus: status,
                clockInTime,
                clockInLocation,
                timeline,
                everClockedInToday: timeline.length > 0
            }
        };

        res.json(response);
    } catch (error) {
        const logger = require('../config/logger');
        logger.error('❌ Error getting attendance status:', error);
        next(error);
    }
};

exports.getUserAttendance = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { startDate, endDate } = req.query;

        const query = { userId };
        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = startDate;
            if (endDate) query.date.$lte = endDate;
        }

        const attendanceRecords = await Attendance.find(query).sort({ timestamp: -1 });

        res.json({ success: true, data: attendanceRecords });
    } catch (error) {
        const logger = require('../config/logger');
        logger.error('Error getting user attendance:', error);
        next(error);
    }
};

exports.clockOutRequest = async (req, res, next) => {
    try {
        const { userId, userName, clockInTime, clockInLocation, requestTime, requestLocation, reason } = req.body;

        // Validate required fields
        if (!userId || !userName || !clockInTime || !clockInLocation || !requestTime || !requestLocation || !reason) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields: userId, userName, clockInTime, clockInLocation, requestTime, requestLocation, and reason are required' 
            });
        }

        // Calculate working time
        const workingTime = new Date(requestTime).getTime() - new Date(clockInTime).getTime();

        // Create clock-out request
        const clockOutRequest = await ClockOutRequest.create({
            userId,
            userName,
            clockInTime: new Date(clockInTime),
            clockInLocation,
            requestTime: new Date(requestTime),
            requestLocation,
            reason,
            workingTime,
            status: 'pending'
        });

        const logger = require('../config/logger');
        logger.info(`Clock-out request created for user ${userName} (${userId})`);

        try {
            const io = getIO();
            io.to('admin-room').emit('clock-out-request', { 
                data: clockOutRequest,
                userId,
                userName
            });
        } catch (socketError) {
             logger.error('❌ Socket emit error:', socketError);
        }

        res.json({ 
            success: true, 
            data: clockOutRequest,
            message: 'Clock-out request submitted successfully. Awaiting administrator approval.' 
        });
    } catch (error) {
        const logger = require('../config/logger');
        logger.error('Error creating clock-out request:', error);
        next(error);
    }
};

exports.getClockOutRequests = async (req, res, next) => {
    try {
        const { status, userId } = req.query;
        const query = {};

        if (status) query.status = status;
        if (userId) query.userId = userId;

        const requests = await ClockOutRequest.find(query).sort({ requestedAt: -1 });

        res.json({ success: true, data: requests });
    } catch (error) {
        const logger = require('../config/logger');
        logger.error('Error fetching clock-out requests:', error);
        next(error);
    }
};

exports.processClockOutRequest = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { status, adminNotes } = req.body;
        const adminId = req.user?._id; // From authenticateToken middleware

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Status must be either "approved" or "rejected"' 
            });
        }

        const clockOutRequest = await ClockOutRequest.findById(requestId);

        if (!clockOutRequest) {
            return res.status(404).json({ 
                success: false, 
                error: 'Clock-out request not found' 
            });
        }

        if (clockOutRequest.status !== 'pending') {
            return res.status(400).json({ 
                success: false, 
                error: `Request has already been ${clockOutRequest.status}` 
            });
        }

        // Update request status
        clockOutRequest.status = status;
        clockOutRequest.processedAt = new Date();
        clockOutRequest.processedBy = adminId;
        if (adminNotes) clockOutRequest.adminNotes = adminNotes;
        await clockOutRequest.save();

        // If approved, update existing attendance record
        if (status === 'approved') {
            const requestDate = new Date(clockOutRequest.requestTime);
            const today = requestDate.toISOString().split('T')[0];
            
            // Find the daily document
            let attendance = await Attendance.findOne({ 
                userId: clockOutRequest.userId, 
                date: today 
            });

            if (attendance) {
                // Find open session
                const sessions = attendance.clockIN_out.attend;
                const currentSession = sessions[sessions.length - 1];
                
                if (currentSession && (!currentSession.clockOut || !currentSession.clockOut.time)) {
                    // Close the session
                    currentSession.clockOut = {
                        time: requestDate,
                        location: clockOutRequest.requestLocation || { latitude: 0, longitude: 0, address: "Admin Approved" }
                    };
                    
                    // Calculate duration
                    const sessionDuration = requestDate - new Date(currentSession.clockIn.time);
                    currentSession.workDuration = sessionDuration;

                    // Update daily totals
                    const totalDuration = sessions.reduce((sum, s) => sum + (s.workDuration || 0), 0);
                    attendance.totalWorkDuration = totalDuration;
                    
                    // Determine status logic (copied from clockOut)
                    const Settings = require('../models/settings'); 
                    const settings = await Settings.findOne();
                    const minWorkHours = settings?.minWorkHours || 8;
                    const minWorkMs = minWorkHours * 60 * 60 * 1000;
                    
                    if (totalDuration >= minWorkMs) {
                        attendance.status = 'Completed Work';
                        attendance.overtime = totalDuration - minWorkMs;
                    } else {
                        attendance.status = 'Partially Completed'; // Early clock-out usually means partial
                    }

                    await attendance.save();
                } else {
                    // Should we create a new session just to close it? Probably not.
                    // If no open session exists, maybe they forgot to clock in?
                    // For now, let's just log a warning as creating a clock-out without clock-in is ambiguous in new schema.
                    const logger = require('../config/logger');
                    logger.warn(`Approved clock-out for ${clockOutRequest.userId} but no open session found.`);
                }
            }

            // Update user's current status
            const User = require('../models/user');
            await User.findByIdAndUpdate(clockOutRequest.userId, { 
                isClockedIn: false,
                lastClockOut: requestDate
            });
        }

        const logger = require('../config/logger');
        logger.info(`Clock-out request ${requestId} ${status} by admin ${adminId}`);

        res.json({ 
            success: true, 
            data: clockOutRequest,
            message: `Clock-out request ${status} successfully` 
        });
    } catch (error) {
        const logger = require('../config/logger');
        logger.error('Error processing clock-out request:', error);
        next(error);
    }
};

exports.getAttendanceToday = async (req, res, next) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const attendanceRecords = await Attendance.find({ date: today })
            .sort({ timestamp: -1 });

        res.json({ success: true, data: attendanceRecords });
    } catch (error) {
        const logger = require('../config/logger');
        logger.error('Error fetching today\'s attendance:', error);
        next(error);
    }
};

/**
 * Get attendance records for a date range
 * @route GET /admin/attendance/range
 * @access Admin/Superadmin only
 */
exports.getAttendanceByDateRange = async (req, res, next) => {
    try {
        const { startDate, endDate, userId } = req.query;
        const logger = require('../config/logger');

        if (!startDate || !endDate) {
            return res.status(400).json({ 
                success: false, 
                error: 'startDate and endDate are required (format: YYYY-MM-DD)' 
            });
        }

        logger.info(`📊 Fetching attendance from ${startDate} to ${endDate}${userId ? ` for user ${userId}` : ''}`);

        const query = {
            date: {
                $gte: startDate,
                $lte: endDate
            }
        };

        if (userId) {
            query.userId = userId;
        }

        const attendanceRecords = await Attendance.find(query)
            .sort({ date: -1, timestamp: -1 });

        // Group by date and user for summary
        const summary = {};
        attendanceRecords.forEach(record => {
            const key = `${record.date}_${record.userId}`;
            if (!summary[key]) {
                summary[key] = {
                    date: record.date,
                    userId: record.userId,
                    userName: record.userName,
                    clockIns: [],
                    clockOuts: [],
                    status: record.status,
                    totalRecords: 0,
                    hasDelayedClockIn: record.isDelayed,
                    delayMinutes: record.delayMinutes || 0
                };
            }

            // Parse sessions from new schema
            const sessions = record.clockIN_out?.attend || [];
            
            sessions.forEach(session => {
                if (session.clockIn && session.clockIn.time) {
                    summary[key].totalRecords++;
                    summary[key].clockIns.push({
                        timestamp: session.clockIn.time,
                        location: session.clockIn.location,
                        isDelayed: record.isDelayed, // Daily level delay status
                        delayMinutes: record.delayMinutes // Daily level delay minutes
                    });
                }
                
                if (session.clockOut && session.clockOut.time) {
                    summary[key].totalRecords++;
                    summary[key].clockOuts.push({
                        timestamp: session.clockOut.time,
                        location: session.clockOut.location,
                        workDuration: session.workDuration
                    });
                }
            });
        });

        logger.info(`✅ Found ${attendanceRecords.length} attendance records`);

        res.json({ 
            success: true, 
            data: attendanceRecords,
            summary: Object.values(summary),
            count: attendanceRecords.length,
            dateRange: { startDate, endDate }
        });
    } catch (error) {
        const logger = require('../config/logger');
        logger.error('Error fetching attendance by date range:', error);
        next(error);
    }
};
