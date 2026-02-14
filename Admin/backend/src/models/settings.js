const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    // Screenshot settings
    screenshotInterval: {
        type: Number,
        default: 30,
        min: 10,
        max: 600
    },

    // Activity detection
    idleThreshold: {
        type: Number,
        default: 30,
        min: 15,
        max: 600
    },

    // Break schedules
    breakSchedules: {
        afternoon: {
            time: {
                type: String,
                default: '14:00'
            },
            duration: {
                type: Number,
                default: 15
            }
        },
        evening: {
            time: {
                type: String,
                default: '18:00'
            },
            duration: {
                type: Number,
                default: 15
            }
        }
    },

    // System settings
    maxUsersAllowed: {
        type: Number,
        default: 100
    },

    maintenanceMode: {
        type: Boolean,
        default: false
    },

    allowScreenshotDeletion: {
        type: Boolean,
        default: false
    },
    
    hideOnMinimize: {
        type: Boolean,
        default: false
    },

    hideFromDockOnMinimize: {
        type: Boolean,
        default: false
    },

    hideFromTrayOnMinimize: {
        type: Boolean,
        default: false
    },

    hideBothOnMinimize: {
        type: Boolean,
        default: false
    },

    // Clock-in settings
    workStartTime: {
        type: String,
        default: '10:00' // Base time for delay calculation
    },
    standardClockInTime: {
        type: String,
        default: '10:15' // Grace period end time
    },
    minWorkHours: {
        type: Number,
        default: 8 // Standard work hours
    },

    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp on save
settingsSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Settings', settingsSchema);
