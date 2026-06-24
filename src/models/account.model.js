const mongoose = require('mongoose');
const { captureRejectionSymbol } = require('nodemailer/lib/xoauth2');

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status:{
        enum: ['active', 'forzen','closed']
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

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;