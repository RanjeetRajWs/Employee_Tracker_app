const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    userName: {
        type: String,
        required: true,
    },

    sessionStart: {
        type: Date,
        required: true
    },

    sessionEnd: {
        type: Date
    },

    workingTime: {
        type: Number,
        default: 0
    },

    idleTime: {
        type: Number,
        default: 0
    },

    screenshotCount: {
        type: Number,
        default: 0
    },

    breaksTaken: {
        type: Number,
        default: 0
    },

    date: {
        type: String, // Format: YYYY-MM-DD
        required: true,
        index: true
    },

    screenshots: [{
        path: String,
        timestamp: Number,
        url: String
    }],

    breakDetails: [{
        startTime: Number,
        endTime: Number,
        duration: Number,
        type: String // 'manual', 'scheduled-afternoon', 'scheduled-evening'
    }],

    // Activity Metrics
    activityMetrics: {
        keyPresses: {
            type: Number,
            default: 0
        },
        mouseClicks: {
            type: Number,
            default: 0
        },
        mouseMovements: {
            type: Number,
            default: 0
        },
        mouseScrolls: {
            type: Number,
            default: 0
        }
    },

    // Application Usage (optional - for future enhancement)
    applications: [{
        name: String,
        duration: Number, // in seconds
        lastActive: Date
    }],

    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
sessionSchema.index({ userId: 1, date: -1 });
sessionSchema.index({ date: -1, isActive: 1 });
// Additional compound index for common query patterns
sessionSchema.index({ userId: 1, date: 1, isActive: 1 });

module.exports = mongoose.model('Session', sessionSchema);
