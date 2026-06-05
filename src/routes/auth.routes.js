const express = require("express")
const authController = require("../controllers/auth.controller.js")

const router = express.Router()

router.post("/register", authController.userRegiseration)
//  POST : /api/auth/register
module.exports = router

