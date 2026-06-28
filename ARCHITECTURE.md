# Banking System Backend — Architecture Guide

A complete deep-dive into every layer of the backend: how it works, why it was built that way, and what was fixed and added.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Project Structure](#2-project-structure)
3. [Entry Points — server.js & app.js](#3-entry-points)
4. [Database Layer](#4-database-layer)
5. [Models](#5-models)
6. [Security Layer](#6-security-layer)
7. [Authentication System](#7-authentication-system)
8. [Input Validation](#8-input-validation)
9. [API Routes & Endpoints](#9-api-routes--endpoints)
10. [Controllers](#10-controllers)
11. [Logging](#11-logging)
12. [Error Handling](#12-error-handling)
13. [Email Service](#13-email-service)
14. [Tests](#14-tests)
15. [Environment Variables](#15-environment-variables)
16. [End-to-End Request Flows](#16-end-to-end-request-flows)

---

## 1. High-Level Architecture

```
Client Request
      │
      ▼
┌─────────────────────────────────────────┐
│               app.js                    │
│  helmet → cors → morgan → json parser   │
│         → cookieParser                  │
└─────────────┬───────────────────────────┘
              │
    ┌─────────▼─────────┐
    │   Route Layer      │
    │  /api/v1/auth      │
    │  /api/v1/account   │
    │  /api/v1/transaction│
    └─────────┬──────────┘
              │
    ┌─────────▼──────────────┐
    │  Per-Route Middleware   │
    │  rateLimiter           │
    │  authMiddleware        │  ← checks JWT + blacklist
    │  express-validator     │  ← validates body/params
    └─────────┬──────────────┘
              │
    ┌─────────▼──────────┐
    │    Controllers      │
    │  auth / account /   │
    │  transaction        │
    └─────────┬───────────┘
              │
    ┌─────────▼──────────┐
    │  Mongoose Models    │
    │  User, Account,     │
    │  Transaction, Ledger│
    │  BlackList          │
    └─────────┬───────────┘
              │
    ┌─────────▼──────────┐
    │   MongoDB Atlas     │
    │  (Replica Set)      │
    └────────────────────┘
              │
    Errors bubble up to
    ┌─────────▼──────────┐
    │  Global Error       │
    │  Handler (Winston)  │
    └────────────────────┘
```

---

## 2. Project Structure

```
bankingSystemBackend/
├── server.js                         Entry point
├── package.json
├── .env                              Secrets (never commit)
├── .gitignore
├── logs/                             Auto-created by Winston (gitignored)
│
├── src/
│   ├── app.js                        Express setup
│   ├── config/
│   │   └── db.js                     MongoDB connection
│   │
│   ├── models/
│   │   ├── user.model.js
│   │   ├── account.model.js
│   │   ├── transaction.model.js
│   │   ├── ledger.model.js
│   │   └── blackList.model.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── account.controller.js
│   │   └── transaction.controller.js
│   │
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── account.routes.js
│   │   └── transaction.route.js
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js        JWT verification + blacklist check
│   │   ├── errorHandler.js           Global error handler
│   │   └── rateLimiter.js            Rate limiting rules
│   │
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── account.validator.js
│   │   └── transaction.validator.js
│   │
│   ├── services/
│   │   └── email.services.js
│   │
│   └── utils/
│       └── logger.js                 Winston logger
│
└── tests/
    ├── setup.js
    ├── auth.test.js
    ├── account.test.js
    └── transaction.test.js
```

---

## 3. Entry Points

### server.js

The application's only entry point. Loads environment variables, connects to MongoDB, then starts Express.

```js
require("dotenv").config()           // Must be first — populates process.env
const app = require("./src/app.js")
const connectToDB = require("./src/config/db.js")

connectToDB()                        // Async, but server starts regardless
app.listen(4000, () => {
    console.log("server is running on port 4000")
})
```

### src/app.js

Wires together every middleware layer in the correct order. **Order matters in Express** — each `app.use()` runs in sequence.

```js
const express = require("express")
const cookieParser = require("cookie-parser")
const helmet = require("helmet")
const cors = require("cors")
const morgan = require("morgan")
const errorHandler = require("./middleware/errorHandler")
const logger = require("./utils/logger")

const app = express()

// 1. Security headers (must be early)
app.use(helmet())

// 2. CORS — which origins can talk to this API
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true   // required for cookies to cross origins
}))

// 3. HTTP request logging
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }))

// 4. Body parsing
app.use(express.json())
app.use(cookieParser())

// 5. Versioned routes
app.use("/api/v1/auth", authRouter)
app.use("/api/v1/account", accountRouter)
app.use("/api/v1/transaction", transactionRoutes)

// 6. Global error handler — MUST be last
app.use(errorHandler)
```

> **Why versioning (`/api/v1/`)?** If you ever change the API contract (rename fields, change behaviour), you can release `/api/v2/` without breaking existing clients.

---

## 4. Database Layer

### src/config/db.js

```js
const mongoose = require("mongoose")

async function connectToDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("server is connected to DB")
    } catch (err) {
        console.error(err)
        process.exit(1)    // If DB fails on startup, kill the process — no point running
    }
}
```

The `MONGO_URI` points to a **MongoDB Atlas replica set**. A replica set is required for MongoDB multi-document transactions (ACID). Without it, `mongoose.startSession()` would throw.

---

## 5. Models

### 5.1 User Model

```js
const userSchema = new mongoose.Schema({
    email:      { type: String, unique: true, required: true, lowercase: true },
    name:       { type: String, required: true },
    password:   { type: String, required: true, minlength: 6, select: false },
    systemUser: { type: Boolean, default: false, immutable: true }
}, { timestamps: true })
```

**Key points:**

- `select: false` on `password` — Mongoose never returns the password field in queries unless you explicitly call `.select("+password")`. This prevents accidentally leaking it in API responses.
- `systemUser: true` marks the special system account used for seeding initial funds. `immutable: true` means once set, it cannot be changed.
- Pre-save hook hashes the password with bcrypt before it ever touches the database:

```js
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next()
    this.password = await bcrypt.hash(this.password, 10)
    next()
})
```

- Instance method for login comparison:

```js
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password)
}
```

### 5.2 Account Model

```js
const accountSchema = new mongoose.Schema({
    user:        { type: ObjectId, ref: "User", required: true, index: true },
    status:      { type: String, enum: ["active", "frozen", "closed"], default: "active" },
    currency:    { type: String, default: "INR" },
    accountType: { type: String, enum: ["savings", "checking"], required: true }
}, { timestamps: true })

// Composite unique index — prevents a user from having two savings accounts
accountSchema.index({ user: 1, accountType: 1 })
```

**`getBalance()` method — the core of the ledger pattern:**

Instead of storing a running balance (which can get out of sync), the balance is always derived live from the immutable ledger:

```js
accountSchema.methods.getBalance = async function () {
    const balanceData = await ledgerModel.aggregate([
        { $match: { account: this._id } },
        {
            $group: {
                _id: null,
                totalDebit:  { $sum: { $cond: [{ $eq: ["$type", "debit"] },  "$amount", 0] } },
                totalCredit: { $sum: { $cond: [{ $eq: ["$type", "credit"] }, "$amount", 0] } },
            }
        },
        { $project: { balance: { $subtract: ["$totalCredit", "$totalDebit"] }, _id: 0 } }
    ])

    if (balanceData.length === 0) return 0
    return balanceData[0].balance
}
```

This aggregation pipeline:
1. Finds all ledger entries for this account
2. Sums all debits and credits separately
3. Returns `credits - debits = balance`

> **Why is this better than a balance field?** A stored balance can get corrupted by bugs, failed transactions, or direct DB edits. The ledger is immutable — the balance derived from it is always mathematically correct and fully auditable.

### 5.3 Transaction Model

```js
const transactionSchema = new mongoose.Schema({
    fromAccount:    { type: ObjectId, ref: "Account", required: true },
    toAccount:      { type: ObjectId, ref: "Account", required: true },
    amount:         { type: Number, required: true },
    status:         { type: String, enum: ["pending", "completed", "failed", "reversed"], default: "pending" },
    idempotencyKey: { type: String, required: true, unique: true }
}, { timestamps: true })
```

The `idempotencyKey` field is unique. If a client sends the same request twice (network retry, double-click), the second request finds the existing transaction by key and returns its current state instead of creating a duplicate transfer.

### 5.4 Ledger Model — Immutable Double-Entry Bookkeeping

```js
const ledgerSchema = new mongoose.Schema({
    account:     { type: ObjectId, ref: "Account", required: true, index: true, immutable: true },
    amount:      { type: Number,   required: true, immutable: true },
    transaction: { type: ObjectId, ref: "Transaction", required: true, index: true, immutable: true },
    type:        { type: String,   enum: ["credit", "debit"], required: true, immutable: true }
})
```

Every field is marked `immutable: true` — Mongoose blocks any attempt to update them after creation.

On top of that, pre-hooks block all Mongoose mutation operations:

```js
function preventLedgerModification() {
    throw new Error('Ledger entries are immutable and cannot be modified or deleted.')
}

ledgerSchema.pre('updateOne',        preventLedgerModification)
ledgerSchema.pre('deleteOne',        preventLedgerModification)
ledgerSchema.pre('findOneAndUpdate', preventLedgerModification)
ledgerSchema.pre('findOneAndDelete', preventLedgerModification)
ledgerSchema.pre('remove',           preventLedgerModification)
ledgerSchema.pre('deleteMany',       preventLedgerModification)
ledgerSchema.pre('updateMany',       preventLedgerModification)
ledgerSchema.pre('findOneAndReplace',preventLedgerModification)
```

**What does double-entry mean?** Every transfer creates exactly two ledger entries:

```
Transfer ₹500 from Account A → Account B

Ledger Entry 1: { account: A, type: "debit",  amount: 500, transaction: TX1 }
Ledger Entry 2: { account: B, type: "credit", amount: 500, transaction: TX1 }
```

Both entries reference the same `transaction` ID, so you can always reconstruct the full picture.

### 5.5 BlackList Model

```js
const blackListSchema = new mongoose.Schema({
    token: { type: String, required: true, unique: true }
}, { timestamps: true })

blackListSchema.index({ createdAt: 1 }, { expireAfterSeconds: 259200 })  // 3 days
```

When a user logs out, their JWT is saved here. The auth middleware checks this collection on every request.

**Why 3 days?** JWT tokens in this app expire after 3 days. There's no point keeping a blacklisted token past its natural expiry — MongoDB's TTL index automatically deletes the entry after 3 days, keeping the collection lean.

---

## 6. Security Layer

### 6.1 Helmet — HTTP Security Headers

```js
app.use(helmet())
```

`helmet` sets 11 HTTP response headers automatically. The important ones:

| Header | What it does |
|--------|-------------|
| `X-Content-Type-Options: nosniff` | Stops browsers from guessing content types |
| `X-Frame-Options: SAMEORIGIN` | Prevents clickjacking via iframes |
| `Strict-Transport-Security` | Forces HTTPS on subsequent visits |
| `X-XSS-Protection` | Enables browser XSS filter |
| `Content-Security-Policy` | Restricts which resources can load |

Without helmet, Express sends headers that reveal implementation details (like `X-Powered-By: Express`).

### 6.2 CORS

```js
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
    credentials: true
}))
```

Cross-Origin Resource Sharing controls which frontend domains can send requests. `credentials: true` is required when the frontend sends cookies (which is how our JWT auth works).

Set `ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com` in production.

### 6.3 Rate Limiting

Defined in `src/middleware/rateLimiter.js`:

```js
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15-minute window
    max: 10,                    // max 10 requests per window per IP
    message: { message: 'Too many requests, please try again after 15 minutes', status: 'failed' }
})

const transactionLimiter = rateLimit({
    windowMs: 60 * 1000,  // 1-minute window
    max: 20               // max 20 transactions per minute per IP
})
```

Applied at the route level:

```js
// Auth routes — stricter (prevents brute-force login)
router.post("/login", authLimiter, loginValidator, validate, authController.userLogin)

// Transaction routes — looser (20/min is enough for legitimate use)
transactionRoutes.post("/", authMiddleware, transactionLimiter, ...)
```

> **Why apply at route level, not app level?** You want tighter limits on sensitive endpoints (login, register) without throttling health checks or public endpoints.

---

## 7. Authentication System

### 7.1 JWT Flow

On successful register or login, the server:
1. Creates a JWT signed with `JWT_SECRET`, expiring in 3 days
2. Sets it as an `httpOnly` cookie (inaccessible to JavaScript — prevents XSS theft)
3. Also returns it in the response body (for clients that prefer the Authorization header)

```js
const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })

res.cookie("token", token, {
    httpOnly: true,                                          // JS can't read this cookie
    secure: process.env.NODE_ENV === "production",          // HTTPS only in prod
    sameSite: "strict"                                       // No cross-site sending
})
```

### 7.2 authMiddleware

Every protected route passes through this middleware. It was rewritten to include a blacklist check:

```js
async function authMiddleware(req, res, next) {
    // Extract token from cookie or Authorization: Bearer <token> header
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1]

    if (!token) return res.status(401).json({ message: 'No token provided' })

    // NEW: Check if this token has been blacklisted (i.e., logged out)
    const isBlacklisted = await blackListModel.findOne({ token })
    if (isBlacklisted) {
        return res.status(401).json({ message: 'Token has been invalidated, please log in again' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(decoded.id)
        if (!user) return res.status(401).json({ message: 'User not found' })

        req.user = user    // Full user object attached for controllers to use
        req.token = token  // Token attached so logout controller can blacklist it
        next()
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' })
    }
}
```

**The blacklist check (what was missing before):** Previously the blackList model existed but was never used — logging out did nothing; the token was still valid until it expired. Now every request checks the blacklist, so logout actually works.

### 7.3 authSystemUserMiddleware

For the system-only initial funds route:

```js
async function authSystemUserMiddleware(req, res, next) {
    // Same token extraction + blacklist check as authMiddleware...

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)

    // Extra check: user must have systemUser: true
    if (!user || !user.systemUser) {
        return res.status(403).json({ message: 'Access denied: system users only' })
    }

    req.user = user
    req.token = token
    next()
}
```

### 7.4 Logout

```js
// POST /api/v1/auth/logout
async function userLogout(req, res) {
    await blackListModel.create({ token: req.token })  // Blacklist the current token
    res.clearCookie("token")                           // Remove cookie
    res.status(200).json({ message: "Logged out successfully" })
}
```

`req.token` is set by `authMiddleware`, so the logout route is protected — you can only log out if you're already authenticated.

---

## 8. Input Validation

Before any controller logic runs, incoming request data is validated using `express-validator`. Validators are defined per-domain in `src/validators/`.

### How it works

Three pieces work together on each route:

```js
// 1. Rules — declarative field-level checks
const registerValidator = [
    body('email').isEmail().normalizeEmail().withMessage('A valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
]

// 2. validate() — reads the result and short-circuits if there are errors
function validate(req, res, next) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array(), status: 'failed' })
    }
    next()
}

// 3. Applied on the route
router.post("/register", authLimiter, registerValidator, validate, authController.userRegiseration)
```

**What gets validated:**

| Route | Validation |
|-------|-----------|
| `POST /auth/register` | email format, password min 6, name not empty |
| `POST /auth/login` | email format, password not empty |
| `POST /account/` | accountType must be `savings` or `checking` |
| `GET /account/balance/:accountId` | accountId must be a valid MongoDB ObjectId |
| `POST /transaction/` | fromAccount/toAccount valid ObjectIds, amount > 0, idempotencyKey not empty |
| `POST /transaction/system/initial-funds` | toAccount valid ObjectId, amount > 0, idempotencyKey not empty |

**Why this matters:** Without validation, a request like `{ "amount": -500 }` or `{ "accountType": "HACKED" }` would reach the database. Express-validator stops bad data at the boundary before any business logic runs.

---

## 9. API Routes & Endpoints

All routes are versioned under `/api/v1/`.

### Auth Routes — `/api/v1/auth`

| Method | Path | Middleware | Controller |
|--------|------|-----------|-----------|
| POST | `/register` | rateLimiter, validator | `userRegiseration` |
| POST | `/login` | rateLimiter, validator | `userLogin` |
| POST | `/logout` | authMiddleware | `userLogout` |

### Account Routes — `/api/v1/account`

| Method | Path | Middleware | Controller |
|--------|------|-----------|-----------|
| POST | `/` | authMiddleware, validator | `createAccountController` |
| GET | `/` | authMiddleware | `getUserAccountsController` |
| GET | `/balance/:accountId` | authMiddleware, validator | `getAccountBalanceController` |

### Transaction Routes — `/api/v1/transaction`

| Method | Path | Middleware | Controller |
|--------|------|-----------|-----------|
| POST | `/` | authMiddleware, transactionLimiter, validator | `createTransaction` |
| POST | `/system/initial-funds` | authSystemUserMiddleware, validator | `createInitialFundsTransaction` |

---

## 10. Controllers

### 10.1 Auth Controller

**Register:**

```js
async function userRegiseration(req, res) {
    const { email, password, name } = req.body

    // Duplicate email check
    const isExists = await userModel.findOne({ email })
    if (isExists) return res.status(422).json({ message: "User already exists" })

    // create() triggers the pre-save hook → password is hashed before insert
    const user = await userModel.create({ email, password, name })

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "3d" })
    res.cookie("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" })

    // Response is sent BEFORE the email is awaited
    // This means the client gets their 201 immediately; email is a side effect
    res.status(201).json({ user: { name: user.name, email: user.email, id: user._id }, token })
    await emailService.sendRegistrationEmail(user.email, user.name)
}
```

**Login — the bug that was fixed:**

Before the fix, the password check used `.then()` but wasn't awaited, so the code continued to token generation regardless of whether the password matched:

```js
// BEFORE (broken): .then() is fire-and-forget here
user.comparePassword(password).then((isMatch) => {
    if (!isMatch) return res.status(401).json(...)  // This return only exits the .then() callback
})
// Execution continued here even on wrong password ↓
const token = jwt.sign(...)  // Token always generated!
```

After the fix:

```js
// AFTER (correct): await blocks execution
const isMatch = await user.comparePassword(password)
if (!isMatch) return res.status(401).json({ message: "Invalid credentials" })
// Only reaches here if password is correct
const token = jwt.sign(...)
```

**Logout:**

```js
async function userLogout(req, res) {
    await blackListModel.create({ token: req.token })  // req.token set by authMiddleware
    res.clearCookie("token")
    res.status(200).json({ message: "Logged out successfully" })
}
```

### 10.2 Account Controller

**Create Account:**

```js
async function createAccountController(req, res) {
    const account = await accountModel.create({
        user: req.user._id,      // user comes from authMiddleware — can't be spoofed
        accountType: req.body.accountType,
        currency: req.body.currency,
    })
    res.status(201).json({ account })
}
```

The composite index `{ user: 1, accountType: 1 }` on the Account model means Mongoose will throw a duplicate key error if the same user tries to create a second savings account. Express 5 forwards this unhandled error to the global error handler automatically.

**Get Balance:**

```js
async function getAccountBalanceController(req, res) {
    const account = await accountModel.findOne({
        _id: req.params.accountId,
        user: req.user._id,        // Scoped to the authenticated user — prevents accessing others' balances
    })

    if (!account) return res.status(404).json({ message: "Account not found" })

    const balance = await account.getBalance()  // Aggregation over the ledger
    res.status(200).json({ balance })
}
```

### 10.3 Transaction Controller — The Core

This is the most complex piece. The full 9-step transfer flow:

```
Step 1: Find both accounts in DB
Step 2: Check idempotency key
Step 3: Verify both accounts are active
Step 4: Derive sender balance from ledger
Step 5: Check sufficient balance
Step 6: Start MongoDB session + transaction
Step 7: Create Transaction document (status: "pending")
Step 8: Create DEBIT ledger entry for sender
Step 9: Create CREDIT ledger entry for receiver
Step 10: Mark Transaction as "completed"
Step 11: Commit session
Step 12: Send email notification
```

**The session and why it matters:**

```js
let transaction
let session
try {
    session = await mongoose.startSession()
    session.startTransaction()

    // All creates inside { session } are atomic —
    // if any of them fail, the whole thing rolls back
    transaction = (await transactionModel.create([{...}], { session }))[0]
    await ledgerModel.create([{ type: "debit",  ... }], { session })
    await ledgerModel.create([{ type: "credit", ... }], { session })
    await transactionModel.findOneAndUpdate({ _id: transaction._id }, { status: "completed" }, { session })

    await session.commitTransaction()  // Everything persists atomically here

} catch (error) {
    if (session) await session.abortTransaction()  // FIXED: was missing — caused session leak
    logger.error('Transaction failed', { error: error.message, idempotencyKey })
    return res.status(500).json({ message: "Transaction failed, please retry" })
} finally {
    if (session) session.endSession()  // FIXED: moved to finally — always runs
}
```

**The session leak fix:** Before the fix, if any DB operation inside the `try` block threw an error, the code jumped straight to `catch` which only returned a 500 response — it never called `abortTransaction()` or `endSession()`. MongoDB kept the session open until it timed out. Under load, this exhausts the connection pool.

The fix: `abortTransaction()` in `catch`, `endSession()` in `finally` (so it always runs, success or failure).

**Idempotency logic:**

```js
const existingTransaction = await transactionModel.findOne({ idempotencyKey })
if (existingTransaction) {
    if (existingTransaction.status === "completed") {
        // Safely return the original — client can treat this as success
        return res.status(200).json({ message: "Transaction already processed", transaction: existingTransaction })
    }
    if (existingTransaction.status === "pending") {
        // Still in-flight — client should poll or wait
        return res.status(200).json({ message: "Transaction is still processing" })
    }
    // failed / reversed — client should retry with a new key
    return res.status(500).json({ message: "Transaction processing failed, please retry" })
}
```

**Status casing fix:** The transaction and ledger schemas define enums in lowercase (`"pending"`, `"completed"`, `"debit"`, `"credit"`). The original controller code used uppercase strings (`"PENDING"`, `"DEBIT"`, etc.). Mongoose does not coerce case — the values were silently rejected, so transactions were never stored with a valid status and ledger entries had the wrong type. All values are now lowercase to match the schema.

---

## 11. Logging

### src/utils/logger.js

```js
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),  // Includes stack trace in error logs
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({ format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )}),
        // File transports only outside test environment
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
})
```

**Two log streams:**
- `logs/error.log` — only errors (easy to grep when something goes wrong)
- `logs/combined.log` — everything

**Morgan pipes into Winston:**

```js
app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) }
}))
```

Every HTTP request gets logged like:
```
info: GET /api/v1/account 200 12ms - 245 bytes
```

**Usage in controllers:**

```js
logger.error('Transaction failed', { error: error.message, idempotencyKey })
```

This logs structured JSON so you can query logs in production tooling:
```json
{ "level": "error", "message": "Transaction failed", "error": "...", "idempotencyKey": "abc123", "timestamp": "2026-06-29T..." }
```

---

## 12. Error Handling

### Why Express 5 matters

In Express 4, if an async route threw an error, the app would crash silently or hang. You had to wrap every controller in try-catch and call `next(err)` manually.

**Express 5 automatically forwards unhandled async errors to the error handler.** This means:

```js
// Express 5 — no try-catch needed for unexpected errors
async function getUserAccountsController(req, res) {
    const accounts = await accountModel.find({ user: req.user._id })
    // If this throws (DB down, network error), Express 5 catches it
    // and forwards to the global error handler
    res.status(200).json({ accounts })
}
```

### Global Error Handler — src/middleware/errorHandler.js

Must be registered **last** in app.js, and must have **four parameters** (the `err` parameter is what tells Express this is an error handler):

```js
function errorHandler(err, req, res, next) {
    logger.error(err.message, {
        stack: err.stack,
        url: req.url,
        method: req.method
    })

    const status = err.status || err.statusCode || 500
    res.status(status).json({
        message: err.message || 'Internal server error',
        status: 'failed'
    })
}
```

Any error that reaches here is logged with full stack trace and returns a clean JSON response to the client instead of crashing.

---

## 13. Email Service

Located at `src/services/email.services.js`. Uses Nodemailer with Gmail OAuth2 (not a plain password — OAuth2 is the secure approach).

```js
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
    }
})

// Only verify the connection outside tests
// (prevents real SMTP calls during test runs)
if (process.env.NODE_ENV !== 'test') {
    transporter.verify((error) => {
        if (error) console.error('Error connecting to email server:', error)
        else console.log('Email server is ready to send messages')
    })
}
```

Three exported functions:
- `sendRegistrationEmail(email, name)` — welcome email on signup
- `sendTransactionEmail(email, name, amount, toAccount)` — transfer confirmation
- `sendTransactionFailureEmail(email, name, amount, toAccount)` — failure notification

---

## 14. Tests

Located in `tests/`. Run with `npm test`.

Uses Jest for test runner and mocking. Controllers are unit-tested by mocking all Mongoose models — no real database connection needed.

### Test structure pattern

```js
// 1. Mock all database models so no real DB calls happen
jest.mock('../src/models/user.model')
const userModel = require('../src/models/user.model')

// 2. Helper to create mock req/res objects
function mockRes() {
    const res = {}
    res.status = jest.fn().mockReturnThis()
    res.json   = jest.fn().mockReturnThis()
    res.cookie = jest.fn().mockReturnThis()
    return res
}

// 3. Test scenarios
it('returns 401 if password does not match', async () => {
    const fakeUser = { comparePassword: jest.fn().mockResolvedValue(false) }
    userModel.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(fakeUser) })

    const req = { body: { email: 'a@b.com', password: 'wrong' } }
    const res = mockRes()

    await userLogin(req, res)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid credentials' }))
})
```

### Coverage summary

| File | Tests |
|------|-------|
| `tests/auth.test.js` | Duplicate email registration, successful register, user-not-found login, wrong password login, successful login, logout blacklisting |
| `tests/account.test.js` | Create account, get all accounts, balance for non-existent account (404), balance for existing account |
| `tests/transaction.test.js` | Invalid accounts (400), duplicate idempotency key (completed), insufficient balance, inactive account, successful transfer |

---

## 15. Environment Variables

All secrets live in `.env` (never commit this file).

```env
# MongoDB
MONGO_URI=mongodb+srv://.../?replicaSet=...

# JWT
JWT_SECRET=your-secret-key-here

# Gmail OAuth2
EMAIL_USER=you@gmail.com
CLIENT_ID=...
CLIENT_SECRET=...
REFRESH_TOKEN=...

# Optional
ALLOWED_ORIGINS=http://localhost:3000,https://yourapp.com
LOG_LEVEL=info
NODE_ENV=development
```

---

## 16. End-to-End Request Flows

### Flow 1: Register a new user

```
POST /api/v1/auth/register
Body: { "email": "john@example.com", "password": "secret123", "name": "John" }

1. helmet adds security headers
2. morgan logs the request
3. express.json() parses the body
4. authLimiter checks this IP hasn't sent 10+ requests in 15 min
5. registerValidator checks email format, password length, name
6. validate() returns 400 if any check failed
7. userRegiseration():
   a. checks email not already in DB
   b. userModel.create() → pre-save hook hashes password → saved to MongoDB
   c. JWT created and set as httpOnly cookie
   d. 201 response sent with user + token
   e. welcome email sent asynchronously
```

### Flow 2: Transfer funds

```
POST /api/v1/transaction
Headers: Authorization: Bearer <token>
Body: { "fromAccount": "...", "toAccount": "...", "amount": 500, "idempotencyKey": "uuid-abc" }

1. authMiddleware:
   a. extracts JWT from cookie or header
   b. checks blacklist → not found, OK
   c. verifies JWT signature
   d. loads user from DB, attaches req.user
2. transactionLimiter checks rate limit
3. createTransactionValidator checks all fields
4. createTransaction():
   a. loads both accounts from DB in parallel
   b. checks idempotency key → not found, first attempt
   c. checks both accounts are "active"
   d. calls fromAccount.getBalance() → aggregates ledger → ₹1000 available
   e. 500 < 1000, balance check passes
   f. mongoose.startSession() → session.startTransaction()
   g. creates Transaction { status: "pending" }
   h. creates LedgerEntry { account: from, type: "debit",  amount: 500 }
   i. creates LedgerEntry { account: to,   type: "credit", amount: 500 }
   j. updates Transaction { status: "completed" }
   k. session.commitTransaction() → all 4 writes atomically persisted
   l. sends transaction email
   m. returns 201 with transaction

If step g–k fails at any point:
   → session.abortTransaction() rolls back all writes
   → session.endSession() releases the connection
   → 500 returned to client
```

### Flow 3: Logout

```
POST /api/v1/auth/logout
Headers: Cookie: token=<jwt>

1. authMiddleware verifies token + checks blacklist
2. userLogout():
   a. saves token to blackListModel
   b. clears the cookie
   c. returns 200

Subsequent requests with the same token:
1. authMiddleware checks blacklist → found → 401 "Token has been invalidated"
```
