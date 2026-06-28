const transactionModel = require("../models/transaction.model.js");
const ledgerModel = require("../models/ledger.model.js");
const accountModel = require("../models/account.model.js");
const mongoose = require("mongoose");
const emailService = require("../services/email.service.js");

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
 * 1. Validate request
 * 2. Validate idempotency key
 * 3. Check account status
 * 4. Derive sender balance from ledger
 * 5. Create transaction (PENDING)
 * 6. Create DEBIT ledger entry
 * 7. Create CREDIT ledger entry
 * 8. Mark transaction COMPLETED
 * 9. Commit MongoDB session
 * 10. Send email notification
 */

async function createTransaction(req, res) {
  // Step 1: Validate request
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  // Step 2: check for missing fields
  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res
      .status(400)
      .json({ message: "Missing required fields", status: "failed" });
  }

  // validate idempotency key
  const isTransactionExists = await transactionModel.findOne({idempotencyKey});

  if (isTransactionExists) {
    {
      if (isTransactionExists.status === "COMPLETED") {
        return res
          .status(200)
          .json({
            message: "Transaction already completed",
            status: "success",
          });
      }
      if (isTransactionExists.status === "PENDING") {
        return res
          .status(202)
          .json({ message: "Transaction is still pending", status: "pending" });
      }
      if (isTransactionExists.status === "FAILED") {
        return res
          .status(400)
          .json({ message: "Transaction failed previously", status: "failed" });
      }
      if (isTransactionExists.status === "REVERSED") {
        return res
          .status(400)
          .json({
            message: "Transaction was reversed, please retry",
            status: "reversed",
          });
      }
    }

    // Step 3: Check account status
    const fromUserAccount = await accountModel.findOne({ _id: fromAccount });
    const toUserAccount = await accountModel.findOne({ _id: toAccount });

    // Check if both accounts exist
    if (!fromUserAccount || !toUserAccount) {
      return res
        .status(404)
        .json({ message: "One or both accounts not found", status: "failed" });
    }

    // Check if both accounts are active
    if (
      fromUserAccount.status !== "ACTIVE" ||
      toUserAccount.status !== "ACTIVE"
    ) {
      return res
        .status(400)
        .json({
          message: "One or both accounts are not active",
          status: "failed",
        });
    }


    // Step 4: Derive sender balance from ledger

    const balance = await fromUserAccount.getBalance();
    if (balance < amount) {
      return res
        .status(400)
        .json({ message: "Insufficient funds", status: "failed" });
    }

  }
}
