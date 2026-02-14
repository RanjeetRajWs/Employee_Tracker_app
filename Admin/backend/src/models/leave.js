const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    fromDate: {
        type: Date,
        required: true
    },
    toDate: {
        type: Date,
        required: true
    },
    leaveType: {
        type: String,
        enum: ['Annual', 'Comp Off'],
        required: true,
        default: 'Annual'
    },
    isHalfDay: {
        type: Boolean,
        default: false
    },
    reason: {
        type: String,
        required: true
    },
    document: {
        type: String // Path to uploaded file
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    rejectionReason: {
        type: String
    },
    adminComment: {
        type: String
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Leave', leaveSchema);
