const {Router}=require("express")
const authMiddleware=require("../middleware/auth.middleware.js");
const transactionController=require("../controllers/transaction.controller.js");


;
const transactionRoutes=Router();




transactionRoutes.post("/",authMiddleware,transactionController.transferFunds);

module.exports=transactionRoutes;
