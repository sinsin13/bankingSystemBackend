const mongoose = require("mongoose");
const { captureRejectionSymbol } = require("nodemailer/lib/xoauth2");
const ledgerModel = require("./ledger.model");

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      enum: ["active", "forzen", "closed"],
      type: String,
      default: "active",
    },
    currency: {
      type: String,
      required: true,
      default: "INR",
    },
    accountType: {
      type: String,
      enum: ["savings", "checking"],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// index to ensure a user cannot have multiple accounts of the same type
accountSchema.index({ user: 1, accountType: 1 });

accountSchema.methods.getBalance = async function () {
  const balanceData = await ledgerModel.aggregate([
    { $match: { account: this._id } },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: {
            $cond: [{ $eq: ["$type", "debit"] }, "$amount", 0],
          },
        },
        totalCredit: {
          $sum: {
            $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0],
          },
        },
      },
    },

    {
      $project: {
        balance: { $subtract: ["$totalCredit", "$totalDebit"] },
        _id: 0,
      },
    },
  ]);

  if (balanceData.length === 0) {
    return 0;
  }
  return balanceData[0].balance;
};
const accountModel = mongoose.model("Account", accountSchema);

module.exports = accountModel;
