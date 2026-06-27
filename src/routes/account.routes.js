const express = require("express");
const  authMiddleware  = require("../../middleware/auth.middleware.js");
const  accountController = require("../controllers/account.controller");




const router = express.Router();

// POST /api/accounts - Create a new account
router.post("/", authMiddleware.authMiddleware, accountController.createAccountController);

module.exports = router;