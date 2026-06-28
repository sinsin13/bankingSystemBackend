const { createTransaction } = require('../src/controllers/transaction.controller');

jest.mock('../src/models/transaction.model');
jest.mock('../src/models/ledger.model');
jest.mock('../src/models/account.model');
jest.mock('../src/services/email.services');
jest.mock('mongoose', () => {
    const actual = jest.requireActual('mongoose');
    return {
        ...actual,
        startSession: jest.fn().mockResolvedValue({
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            abortTransaction: jest.fn(),
            endSession: jest.fn(),
        }),
    };
});

const transactionModel = require('../src/models/transaction.model');
const ledgerModel = require('../src/models/ledger.model');
const accountModel = require('../src/models/account.model');
const emailService = require('../src/services/email.services');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

const baseReq = {
    body: {
        fromAccount: '64f1a2b3c4d5e6f7a8b9c0d1',
        toAccount:   '64f1a2b3c4d5e6f7a8b9c0d2',
        amount: 100,
        idempotencyKey: 'key-001',
    },
    user: { _id: 'uid1', email: 'a@b.com', name: 'Test' },
};

describe('createTransaction', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 400 if fromAccount or toAccount not found', async () => {
        accountModel.findOne.mockResolvedValue(null);
        const res = mockRes();

        await createTransaction({ ...baseReq }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid fromAccount or toAccount' }));
    });

    it('returns 200 with existing transaction on duplicate idempotency key (completed)', async () => {
        const fakeAccount = { status: 'active', getBalance: jest.fn().mockResolvedValue(500) };
        accountModel.findOne.mockResolvedValue(fakeAccount);
        const existingTx = { status: 'completed', _id: 'tx1' };
        transactionModel.findOne.mockResolvedValue(existingTx);

        const res = mockRes();
        await createTransaction({ ...baseReq }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Transaction already processed' }));
    });

    it('returns 400 on insufficient balance', async () => {
        const fakeAccount = { status: 'active', getBalance: jest.fn().mockResolvedValue(50) };
        accountModel.findOne.mockResolvedValue(fakeAccount);
        transactionModel.findOne.mockResolvedValue(null);

        const res = mockRes();
        await createTransaction({ ...baseReq }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Insufficient balance') }));
    });

    it('returns 400 if an account is not active', async () => {
        accountModel.findOne
            .mockResolvedValueOnce({ status: 'frozen', getBalance: jest.fn() })
            .mockResolvedValueOnce({ status: 'active', getBalance: jest.fn() });
        transactionModel.findOne.mockResolvedValue(null);

        const res = mockRes();
        await createTransaction({ ...baseReq }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('active') }));
    });

    it('creates transaction and returns 201 on success', async () => {
        const fakeAccount = { status: 'active', getBalance: jest.fn().mockResolvedValue(500) };
        accountModel.findOne.mockResolvedValue(fakeAccount);
        transactionModel.findOne.mockResolvedValue(null);

        const fakeTx = { _id: 'tx1', status: 'pending' };
        transactionModel.create.mockResolvedValue([fakeTx]);
        ledgerModel.create.mockResolvedValue([{}]);
        transactionModel.findOneAndUpdate.mockResolvedValue({});
        emailService.sendTransactionEmail.mockResolvedValue();

        const res = mockRes();
        await createTransaction({ ...baseReq }, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Transaction completed successfully' }));
    });
});
