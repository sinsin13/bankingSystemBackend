const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.services");
const mongoose = require("mongoose");
const logger = require("../utils/logger");

async function createTransaction(req, res) {
    const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

    const [fromUserAccount, toUserAccount] = await Promise.all([
        accountModel.findOne({ _id: fromAccount }),
        accountModel.findOne({ _id: toAccount }),
    ]);

    if (!fromUserAccount || !toUserAccount) {
        return res.status(400).json({ message: "Invalid fromAccount or toAccount" });
    }

    const existingTransaction = await transactionModel.findOne({ idempotencyKey });
    if (existingTransaction) {
        if (existingTransaction.status === "completed") {
            return res.status(200).json({ message: "Transaction already processed", transaction: existingTransaction });
        }
        if (existingTransaction.status === "pending") {
            return res.status(200).json({ message: "Transaction is still processing" });
        }
        if (existingTransaction.status === "failed") {
            return res.status(500).json({ message: "Transaction processing failed, please retry" });
        }
        if (existingTransaction.status === "reversed") {
            return res.status(500).json({ message: "Transaction was reversed, please retry" });
        }
    }

    if (fromUserAccount.status !== "active" || toUserAccount.status !== "active") {
        return res.status(400).json({ message: "Both accounts must be active to process a transaction" });
    }

    const balance = await fromUserAccount.getBalance();
    if (balance < amount) {
        return res.status(400).json({
            message: `Insufficient balance. Current balance: ${balance}, requested: ${amount}`
        });
    }

    let transaction;
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        transaction = (await transactionModel.create([{
            fromAccount, toAccount, amount, idempotencyKey, status: "pending"
        }], { session }))[0];

        await ledgerModel.create([{
            account: fromAccount, amount, transaction: transaction._id, type: "debit"
        }], { session });

        await ledgerModel.create([{
            account: toAccount, amount, transaction: transaction._id, type: "credit"
        }], { session });

        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "completed" },
            { session }
        );

        await session.commitTransaction();
    } catch (error) {
        if (session) await session.abortTransaction();
        logger.error('Transaction failed', { error: error.message, idempotencyKey });
        return res.status(500).json({ message: "Transaction failed, please retry" });
    } finally {
        if (session) session.endSession();
    }

    await emailService.sendTransactionEmail(req.user.email, req.user.name, amount, toAccount);

    return res.status(201).json({ message: "Transaction completed successfully", transaction });
}

async function createInitialFundsTransaction(req, res) {
    const { toAccount, amount, idempotencyKey } = req.body;

    const [toUserAccount, fromUserAccount] = await Promise.all([
        accountModel.findOne({ _id: toAccount }),
        accountModel.findOne({ user: req.user._id }),
    ]);

    if (!toUserAccount) {
        return res.status(400).json({ message: "Invalid toAccount" });
    }
    if (!fromUserAccount) {
        return res.status(400).json({ message: "System user account not found" });
    }

    let transaction;
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();

        [transaction] = await transactionModel.create([{
            fromAccount: fromUserAccount._id, toAccount, amount, idempotencyKey, status: "pending"
        }], { session });

        await ledgerModel.create([{
            account: fromUserAccount._id, amount, transaction: transaction._id, type: "debit"
        }], { session });

        await ledgerModel.create([{
            account: toAccount, amount, transaction: transaction._id, type: "credit"
        }], { session });

        await transactionModel.findOneAndUpdate(
            { _id: transaction._id },
            { status: "completed" },
            { session }
        );

        await session.commitTransaction();
    } catch (error) {
        if (session) await session.abortTransaction();
        logger.error('Initial funds transaction failed', { error: error.message });
        return res.status(500).json({ message: "Initial funds transaction failed" });
    } finally {
        if (session) session.endSession();
    }

    return res.status(201).json({ message: "Initial funds transaction completed successfully", transaction });
}

module.exports = { createTransaction, createInitialFundsTransaction };
