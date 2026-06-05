const userModel = require("../models/user.model.js")



// POST : /api/auth/register

function userRegiseration(req, res){
    const {email, password, name} = req.body
}


module.exports = {
    userRegiseration
}