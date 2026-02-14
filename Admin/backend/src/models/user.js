const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    role: {
        type: String,
        enum: ['user'],
        default: 'user',
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    lastLogin: {
        type: Date,
    },
    lastActive: {
        type: Date,
    },
    tempPassword: {
        type: Boolean,
        default: false,
    },
    isClockedIn: {
        type: Boolean,
        default: false,
    },
    lastClockIn: {
        type: Date,
    },
    lastClockOut: {
        type: Date,
    },
    joinDate: {
        type: Date,
        default: Date.now, 
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
    compOffBalance: {
        type: Number,
        default: 0,
    },
    // Personal Details
    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'] },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
    bloodGroup: { type: String },
    placeOfBirth: { type: String },
    nationality: { type: String },
    physicallyHandicapped: { type: Boolean, default: false },
    knownLanguages: [{ type: String }],
    
    // Employment Details
    companyName: { type: String },
    legalEntity: { type: String },
    employeeId: { type: String, unique: true, sparse: true },
    uniqueId: { type: String }, // e.g., National ID
    ledgerCode: { type: String },
    displayName: { type: String },
    department: { type: String },
    designation: { type: String },
    
    // Contact Info
    phone: { type: String },
    altPhone: { type: String },
    personalEmail: { type: String },
    
    // Addresses
    currentAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    permanentAddress: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    
    // Emergency Contact
    emergencyContact: {
        name: String,
        relation: String,
        phone: String,
        address: String
    },
    
    // Social Links
    socialLinks: {
        linkedin: String,
        twitter: String,
        github: String,
        portfolio: String
    },

    // Family Info
    familyDetails: [{
        name: String,
        relationship: String,
        dateOfBirth: Date,
        occupation: String,
        phone: String
    }],

    // Education
    education: [{
        institute: String,
        degree: String,
        specialization: String,
        startDate: Date,
        endDate: Date,
        grade: String
    }],

    // Previous Employment
    previousEmployment: [{
        companyName: String,
        designation: String,
        startDate: Date,
        endDate: Date,
        reasonForLeaving: String,
        location: String
    }],

    // Bank Details (Finance)
    bankDetails: {
        bankName: String,
        accountHolderName: String,
        accountNumber: String,
        ifscCode: String,
        panNumber: String,
        aadhaarNumber: String,
        pfAccountNumber: String,
        uanNumber: String
    },
    
    // Documents
    documents: [{
        title: String,
        type: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now }
    }]
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ isActive: 1 });

// Update the updatedAt timestamp before saving
// userSchema.pre('save', function (next) {
//     this.updatedAt = Date.now();
//     next();
// });

// Hash password before saving when it's new or modified
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        return next();
    } catch (err) {
        return next(err);
    }
});

// Instance method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
