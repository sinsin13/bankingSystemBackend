const { body, validationResult } = require('express-validator');

const createTransactionValidator = [
    body('fromAccount').isMongoId().withMessage('Valid fromAccount ID is required'),
    body('toAccount').isMongoId().withMessage('Valid toAccount ID is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('idempotencyKey').trim().notEmpty().withMessage('idempotencyKey is required'),
];

const initialFundsValidator = [
    body('toAccount').isMongoId().withMessage('Valid toAccount ID is required'),
    body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('idempotencyKey').trim().notEmpty().withMessage('idempotencyKey is required'),
];

function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array(), status: 'failed' });
    }
    next();
}

module.exports = { createTransactionValidator, initialFundsValidator, validate };
