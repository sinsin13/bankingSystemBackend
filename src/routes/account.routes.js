const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const accountController = require("../controllers/account.controller");
const { createAccountValidator, accountIdValidator, validate } = require("../validators/account.validator");

const router = express.Router();

router.post("/", authMiddleware, createAccountValidator, validate, accountController.createAccountController);
router.get("/", authMiddleware, accountController.getUserAccountsController);
router.get("/balance/:accountId", authMiddleware, accountIdValidator, validate, accountController.getAccountBalanceController);

module.exports = router;
