const mongoose = require('mongoose');
const accountModel = require('./account.model');



const ledgerSchema = new mongoose.schema({

    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: [true, 'Account reference is required'],
        index: true,
        immutable: true
    },
    amount:{
        type: Number,
        required: [true, 'Amount is required'],
        immutable: true
    },
    transaction:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: [true, 'Transaction reference is required'],
        index: true,
        immutable: true
    },
    type:{
        type: String,
        enum: ['credit', 'debit'],
        required: [true, 'Ledger type is required'],
        immutable: true
    }

})


function preventLedgerModification() {
    throw new Error('Ledger entries are immutable and cannot be modified or deleted.');
}

ledgerSchema.pre('updateOne', preventLedgerModification);
ledgerSchema.pre('deleteOne', preventLedgerModification);
ledgerSchema.pre('findOneAndUpdate', preventLedgerModification);
ledgerSchema.pre('findOneAndDelete', preventLedgerModification);

const ledgerModel = mongoose.model('Ledger', ledgerSchema);

module.exports = ledgerModel;