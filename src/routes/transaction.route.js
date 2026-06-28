const { Router } = require('express');
const { authMiddleware, authSystemUserMiddleware } = require('../middleware/auth.middleware');
const transactionController = require("../controllers/transaction.controller");
const { transactionLimiter } = require('../middleware/rateLimiter');
const { createTransactionValidator, initialFundsValidator, validate } = require('../validators/transaction.validator');

const transactionRoutes = Router();

transactionRoutes.post("/", authMiddleware, transactionLimiter, createTransactionValidator, validate, transactionController.createTransaction);
transactionRoutes.post("/system/initial-funds", authSystemUserMiddleware, initialFundsValidator, validate, transactionController.createInitialFundsTransaction);

module.exports = transactionRoutes;
