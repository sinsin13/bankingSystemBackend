const accountModel = require("../models/account.model");

async function createAccountController(req, res) {
  const user = req.user;

  const account = await accountModel.create({
    user: user._id,
    accountType: req.body.accountType,
    currency: req.body.currency,
  });

  res.status(201).json({ account });
}

async function getUserAccountsController(req, res) {
  const accounts = await accountModel.find({ user: req.user._id });
  res.status(200).json({ accounts });
}

async function getAccountBalanceController(req, res) {
  const account = await accountModel.findOne({
    _id: req.params.accountId,
    user: req.user._id,
  });

  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  const balance = await account.getBalance();
  res.status(200).json({ balance });
}

module.exports = {
  createAccountController,
  getUserAccountsController,
  getAccountBalanceController,
};
