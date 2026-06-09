const userModel = require("../models/user.model.js");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const emailService = require("../services/email.services.js");

// POST : /api/auth/register

async function userRegiseration(req, res) {
  const { email, password, name } = req.body;

  const isExists = await userModel.findOne({ email: email });

  if (isExists) {
    return res
      .status(422)
      .json({ message: "User already exists", status: "failed" });
  }

  const user = await userModel.create({
    email,
    password,
    name,
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });
  res.cookie("token", token);
  res.status(201).json({
    user: {
      name: user.name,
      email: user.email,
      id: user._id,
    },
    token,
  });


  await emailService.sendRegistrationEmail(user.email, user.name);
}

async function userLogin(req, res) {
  const { email, password } = req.body;
  const user = await userModel.findOne({ email: email }).select("+password");

  if (!user) {
    return res
      .status(404)
      .json({ message: "User not found", status: "failed" });
  }

  user.comparePassword(password).then((isMatch) => {
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Invalid credentials", status: "failed" });
    }
  });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });
  res.cookie("token", token);
  res.status(201).json({
    user: {
      name: user.name,
      email: user.email,
      id: user._id,
    },
    token,
  });
}
module.exports = {
  userRegiseration,
  userLogin,
};
