const { body, param, validationResult } = require('express-validator');

const createAccountValidator = [
    body('accountType')
        .isIn(['savings', 'checking'])
        .withMessage('accountType must be savings or checking'),
    body('currency')
        .optional()
        .isString()
        .trim()
        .notEmpty()
        .withMessage('currency must be a non-empty string'),
];

const accountIdValidator = [
    param('accountId').isMongoId().withMessage('Invalid accountId'),
];

function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array(), status: 'failed' });
    }
    next();
}

module.exports = { createAccountValidator, accountIdValidator, validate };
