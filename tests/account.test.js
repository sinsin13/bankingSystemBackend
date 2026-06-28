const {
    createAccountController,
    getUserAccountsController,
    getAccountBalanceController,
} = require('../src/controllers/account.controller');

jest.mock('../src/models/account.model');
const accountModel = require('../src/models/account.model');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

describe('createAccountController', () => {
    beforeEach(() => jest.clearAllMocks());

    it('creates an account and returns 201', async () => {
        const fakeAccount = { _id: 'acc1', accountType: 'savings', currency: 'INR' };
        accountModel.create.mockResolvedValue(fakeAccount);

        const req = { user: { _id: 'uid1' }, body: { accountType: 'savings', currency: 'INR' } };
        const res = mockRes();

        await createAccountController(req, res);

        expect(accountModel.create).toHaveBeenCalledWith({
            user: 'uid1', accountType: 'savings', currency: 'INR'
        });
        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({ account: fakeAccount });
    });
});

describe('getUserAccountsController', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns all accounts for the user', async () => {
        const fakeAccounts = [{ _id: 'acc1' }, { _id: 'acc2' }];
        accountModel.find.mockResolvedValue(fakeAccounts);

        const req = { user: { _id: 'uid1' } };
        const res = mockRes();

        await getUserAccountsController(req, res);

        expect(accountModel.find).toHaveBeenCalledWith({ user: 'uid1' });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ accounts: fakeAccounts });
    });
});

describe('getAccountBalanceController', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 404 if account not found', async () => {
        accountModel.findOne.mockResolvedValue(null);

        const req = { user: { _id: 'uid1' }, params: { accountId: 'acc1' } };
        const res = mockRes();

        await getAccountBalanceController(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns balance when account is found', async () => {
        const fakeAccount = { getBalance: jest.fn().mockResolvedValue(5000) };
        accountModel.findOne.mockResolvedValue(fakeAccount);

        const req = { user: { _id: 'uid1' }, params: { accountId: 'acc1' } };
        const res = mockRes();

        await getAccountBalanceController(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ balance: 5000 });
    });
});
