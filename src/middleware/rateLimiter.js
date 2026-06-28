const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { message: 'Too many requests from this IP, please try again after 15 minutes', status: 'failed' },
    standardHeaders: true,
    legacyHeaders: false
});

const transactionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { message: 'Too many transaction requests, please slow down', status: 'failed' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { authLimiter, transactionLimiter };
