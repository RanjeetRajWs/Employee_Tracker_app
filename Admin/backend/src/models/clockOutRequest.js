const mongoose = require('mongoose');

const clockOutRequestSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    userName: {
        type: String,
        required: true
    },
    clockInTime: {
        type: Date,
        required: true
    },
    clockInLocation: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        address: {
            type: String
        },
        accuracy: {
            type: Number
        }
    },
    requestTime: {
        type: Date,
        required: true
    },
    requestLocation: {
        latitude: {
            type: Number,
            required: true
        },
        longitude: {
            type: Number,
            required: true
        },
        address: {
            type: String
        },
        accuracy: {
            type: Number
        }
    },
    reason: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    requestedAt: {
        type: Date,
        default: Date.now
    },
    processedAt: {
        type: Date
    },
    processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    adminNotes: {
        type: String
    },
    // Store working time at the time of request
    workingTime: {
        type: Number // in milliseconds
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
clockOutRequestSchema.index({ userId: 1, status: 1 });
clockOutRequestSchema.index({ requestedAt: -1 });

module.exports = mongoose.model('ClockOutRequest', clockOutRequestSchema);
