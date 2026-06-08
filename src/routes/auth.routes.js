const express = require("express")
const authController = require("../controllers/auth.controller.js")

const router = express.Router()

//  POST : /api/auth/register
router.post("/register", authController.userRegiseration)

//  POST : /api/auth/login
router.post("/login", authController.userLogin)
module.exports = router

