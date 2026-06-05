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
  
  
}

module.exports = {
  userRegiseration,
};
