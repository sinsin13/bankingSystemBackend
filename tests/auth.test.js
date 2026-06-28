const { userRegiseration, userLogin, userLogout } = require('../src/controllers/auth.controller');

jest.mock('../src/models/user.model');
jest.mock('../src/models/blackList.model');
jest.mock('../src/services/email.services');

const userModel = require('../src/models/user.model');
const blackListModel = require('../src/models/blackList.model');
const emailService = require('../src/services/email.services');

function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
}

describe('userRegiseration', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 422 if email already exists', async () => {
        userModel.findOne.mockResolvedValue({ email: 'a@b.com' });
        const req = { body: { email: 'a@b.com', password: 'pass123', name: 'Test' } };
        const res = mockRes();

        await userRegiseration(req, res);

        expect(res.status).toHaveBeenCalledWith(422);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'User already exists' }));
    });

    it('creates user and returns token on success', async () => {
        userModel.findOne.mockResolvedValue(null);
        userModel.create.mockResolvedValue({ _id: 'uid1', name: 'Test', email: 'a@b.com' });
        emailService.sendRegistrationEmail.mockResolvedValue();

        const req = { body: { email: 'a@b.com', password: 'pass123', name: 'Test' } };
        const res = mockRes();

        await userRegiseration(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
    });
});

describe('userLogin', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 404 if user not found', async () => {
        userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
        const req = { body: { email: 'a@b.com', password: 'pass123' } };
        const res = mockRes();

        await userLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 401 if password does not match', async () => {
        const fakeUser = { comparePassword: jest.fn().mockResolvedValue(false) };
        userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
        const req = { body: { email: 'a@b.com', password: 'wrong' } };
        const res = mockRes();

        await userLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid credentials' }));
    });

    it('returns token on successful login', async () => {
        const fakeUser = {
            _id: 'uid1', name: 'Test', email: 'a@b.com',
            comparePassword: jest.fn().mockResolvedValue(true)
        };
        userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) });
        const req = { body: { email: 'a@b.com', password: 'pass123' } };
        const res = mockRes();

        await userLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
    });
});

describe('userLogout', () => {
    beforeEach(() => jest.clearAllMocks());

    it('blacklists token and clears cookie', async () => {
        blackListModel.create.mockResolvedValue({});
        const req = { token: 'sometoken' };
        const res = mockRes();

        await userLogout(req, res);

        expect(blackListModel.create).toHaveBeenCalledWith({ token: 'sometoken' });
        expect(res.clearCookie).toHaveBeenCalledWith('token');
        expect(res.status).toHaveBeenCalledWith(200);
    });
});
