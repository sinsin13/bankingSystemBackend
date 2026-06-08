const userModel = require("../models/user.model.js");
const jwt = require("jsonwebtoken");
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
}

module.exports = {
  userRegiseration,
};
