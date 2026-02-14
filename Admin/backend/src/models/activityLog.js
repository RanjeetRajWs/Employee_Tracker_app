const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },

    userName: {
        type: String,
        required: false,
        default: 'Unknown'
    },

    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: false // Made optional for system events
    },

    activityType: {
        type: String,
        required: true
        // Removed enum to allow generic actions like 'SYNC_SUCCESS', 'LOGIN', etc.
    },

    timestamp: {
        type: Date,
        required: true,
        index: true
    },

    duration: {
        type: Number, // in milliseconds
        default: 0
    },

    metadata: {
        type: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ sessionId: 1, timestamp: -1 });
activityLogSchema.index({ activityType: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
