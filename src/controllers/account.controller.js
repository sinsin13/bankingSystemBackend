const accountModel = require("../models/account.model");

async function createAccountController(req, res) {
  const user = req.user; // Assuming user is attached to req by auth middleware

  const account = await accountModel.create({
    user: user._id,
    accountType: req.body.accountType,
    currency: req.body.currency,
  });

  res.status(201).json({
    account,
  });
}

module.exports = { createAccountController };
