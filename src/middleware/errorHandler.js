const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
    logger.error(err.message, { stack: err.stack, url: req.url, method: req.method });

    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        message: err.message || 'Internal server error',
        status: 'failed'
    });
}

module.exports = errorHandler;
