const express = require("express");
const authController = require("../controllers/auth.controller.js");
const { authMiddleware } = require("../middleware/auth.middleware.js");
const { authLimiter } = require("../middleware/rateLimiter.js");
const { registerValidator, loginValidator, validate } = require("../validators/auth.validator.js");

const router = express.Router();

router.post("/register", authLimiter, registerValidator, validate, authController.userRegiseration);
router.post("/login", authLimiter, loginValidator, validate, authController.userLogin);
router.post("/logout", authMiddleware, authController.userLogout);

module.exports = router;
