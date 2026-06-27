const User = require('../src/models/user.model');
const jwt = require('jsonwebtoken');

async function authMiddleware(req, res, next) {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

    if(!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        req.user = user; // Attach user to request object
        next();
    }
    catch(err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

module.exports = {authMiddleware};
