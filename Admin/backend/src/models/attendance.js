const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    userName: {
        type: String,
        required: true,
    },
    clockIN_out:{
            attend:[{
            clockIn:{
                time:{type: Date,default: Date.now },
                location:{
                    latitude:{ type: Number, required: true }, 
                    longitude:{ type: Number, required: true }, 
                    address:{ type: String },
                    accuracy: { type: Number }
                } 
            }, 
            clockOut:{
                time:{type: Date,default: null },
                location:{
                    latitude:{ type: Number, required: true }, 
                    longitude:{ type: Number, required: true }, 
                    address:{ type: String },
                    accuracy: { type: Number }
                }
            },
            isLocationValid: {type: Boolean, default: true },
            workDuration:{ type: Number, default: 0 }, 
        }],
    },
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        index: true
    },
    // Delay tracking for clock-in
    isDelayed: {
        type: Boolean,// will be update to true if user clock-in after standard work start time (e.g., 10:00 AM) and delayMinutes will be calculated based on the difference between actual clock-in time and standard work start time
        default: false
    },
    delayMinutes: { // will be calculated based on the first clock-in from clockIN_out.attend array and standard work start time (e.g., 10:15 AM)
        type: Number,
        default: 0
    },
    // Work duration and status for clock-out
    totalWorkDuration: {
        type: Number, // In milliseconds , will be calculated based on clockIn and clockOut times
        default: 0
    },
    overtime: {
        type: Number, // In milliseconds. will be calculated based on totalWorkDuration and standard work hours (e.g., 8 hours)
        default: 0
    },
    clockInAttempts:{type: Number, default: 0, max: 5},
    status: {// once clock-in is done from app this status will be 'Present' and when clock-out is done it will be updated to 'Completed Work' or 'Partially Completed' based on work duration, if user never clock-in then it will be 'Absent'
        type: String,
        enum: ['Present', 'Completed Work', 'Partially Completed', 'Absent'],
        default: 'Present'
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
attendanceSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
