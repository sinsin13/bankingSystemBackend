const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const blackListModel = require('../models/blackList.model');

async function authMiddleware(req, res, next) {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const isBlacklisted = await blackListModel.findOne({ token });
    if (isBlacklisted) {
        return res.status(401).json({ message: 'Token has been invalidated, please log in again' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

async function authSystemUserMiddleware(req, res, next) {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const isBlacklisted = await blackListModel.findOne({ token });
    if (isBlacklisted) {
        return res.status(401).json({ message: 'Token has been invalidated, please log in again' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user || !user.systemUser) {
            return res.status(403).json({ message: 'Access denied: system users only' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

module.exports = { authMiddleware, authSystemUserMiddleware };
