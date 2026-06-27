const mongoose = require('mongoose');
const { captureRejectionSymbol } = require('nodemailer/lib/xoauth2');

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    status:{
        enum: ['active', 'forzen','closed'],
        type: String,
        default: 'active',
    },
    currency :{
        type: String,
        required: true,
        default: 'INR',
    },
    accountType: {
        type: String,
        enum: ['savings', 'checking'],
        required: true,
    }
}, {
    timestamps: true,
});

// index to ensure a user cannot have multiple accounts of the same type
accountSchema.index({ user: 1, accountType: 1 });

const accountModel = mongoose.model('Account', accountSchema);

module.exports = accountModel;