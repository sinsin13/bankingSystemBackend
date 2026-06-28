const userModel = require("../models/user.model.js");
const blackListModel = require("../models/blackList.model.js");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.services.js");

async function userRegiseration(req, res) {
    const { email, password, name } = req.body;

    const isExists = await userModel.findOne({ email });
    if (isExists) {
        return res.status(422).json({ message: "User already exists", status: "failed" });
    }

    const user = await userModel.create({ email, password, name });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });

    res.status(201).json({
        user: { name: user.name, email: user.email, id: user._id },
        token,
    });

    await emailService.sendRegistrationEmail(user.email, user.name);
}

async function userLogin(req, res) {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email }).select("+password");

    if (!user) {
        return res.status(404).json({ message: "User not found", status: "failed" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials", status: "failed" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" });
    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });

    res.status(200).json({
        user: { name: user.name, email: user.email, id: user._id },
        token,
    });
}

async function userLogout(req, res) {
    await blackListModel.create({ token: req.token });
    res.clearCookie("token");
    res.status(200).json({ message: "Logged out successfully" });
}

module.exports = { userRegiseration, userLogin, userLogout };
