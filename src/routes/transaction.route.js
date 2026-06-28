const {Router}=require("express");

const authMiddleware=require("../middleware/auth.middleware.js");

const transactionRouter=Router();

transactionRoutes.post("/",authMiddleware,transactionController.transferFunds);
