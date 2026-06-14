const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    accountType: {
        type: String,
        enum: ['savings', 'checking'],
        required: true,
    },
    balance: {
        type: Number,   
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;