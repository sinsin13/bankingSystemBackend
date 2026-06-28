# Banking System Backend

A production-grade RESTful banking API built with Node.js and Express. Implements double-entry bookkeeping, ACID-compliant fund transfers, JWT authentication with token blacklisting, and immutable ledger entries — the same architectural patterns used in real financial systems.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [Architecture Highlights](#architecture-highlights)

---

## Features

- **Double-entry bookkeeping** — account balances are never stored directly; they are always derived live from an immutable ledger of debit/credit entries
- **ACID fund transfers** — multi-document writes (transaction + two ledger entries) are wrapped in a MongoDB session, guaranteeing all-or-nothing atomicity
- **Idempotent transfers** — every transaction requires a client-supplied `idempotencyKey`; duplicate requests return the original result instead of creating a double charge
- **Immutable audit trail** — ledger entries cannot be updated or deleted; Mongoose pre-hooks block all mutation operations at the model layer
- **JWT authentication** with `httpOnly` cookie delivery and a token blacklist that makes logout actually work
- **Role-based access** — a dedicated system-user middleware guards the initial funds seeding route
- **Input validation** on every endpoint using `express-validator`
- **Rate limiting** — 10 req/15 min on auth routes, 20 req/min on transactions
- **Security headers** via Helmet, CORS configuration, and `sameSite: strict` cookies
- **Structured logging** with Winston (console + rotating log files) and Morgan for HTTP access logs
- **Global error handling** — unhandled async errors are caught by Express 5 and routed to a single JSON error handler
- **Email notifications** via Nodemailer + Gmail OAuth2 on registration and fund transfers
- **15 unit tests** covering auth, account, and transaction controller logic

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB Atlas (Replica Set) |
| ODM | Mongoose 9 |
| Authentication | JSON Web Tokens (`jsonwebtoken`) |
| Password Hashing | `bcryptjs` |
| Input Validation | `express-validator` |
| Rate Limiting | `express-rate-limit` |
| Security Headers | `helmet` |
| CORS | `cors` |
| HTTP Logging | `morgan` |
| Structured Logging | `winston` |
| Email | `nodemailer` (Gmail OAuth2) |
| Cookie Parsing | `cookie-parser` |
| Environment Config | `dotenv` |
| Testing | `jest` + `supertest` |
| Dev Server | `nodemon` |

---

## Project Structure

```
bankingSystemBackend/
├── server.js                   Entry point
├── src/
│   ├── app.js                  Express setup, middleware stack, route mounting
│   ├── config/
│   │   └── db.js               MongoDB connection
│   ├── models/
│   │   ├── user.model.js       User schema with bcrypt pre-save hook
│   │   ├── account.model.js    Account schema with live getBalance() method
│   │   ├── transaction.model.js Transfer records with idempotency key
│   │   ├── ledger.model.js     Immutable double-entry ledger entries
│   │   └── blackList.model.js  JWT blacklist with 3-day TTL index
│   ├── controllers/
│   │   ├── auth.controller.js       Register, login, logout
│   │   ├── account.controller.js    Create, list, balance
│   │   └── transaction.controller.js Fund transfer, system initial funding
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── account.routes.js
│   │   └── transaction.route.js
│   ├── middleware/
│   │   ├── auth.middleware.js   JWT verification + blacklist check + system user guard
│   │   ├── errorHandler.js      Global error handler
│   │   └── rateLimiter.js       Per-route rate limit configs
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── account.validator.js
│   │   └── transaction.validator.js
│   ├── services/
│   │   └── email.services.js   Nodemailer transporter + email templates
│   └── utils/
│       └── logger.js           Winston logger config
└── tests/
    ├── setup.js
    ├── auth.test.js
    ├── account.test.js
    └── transaction.test.js
```

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | — | Create a new user account |
| `POST` | `/auth/login` | — | Login and receive a JWT |
| `POST` | `/auth/logout` | ✓ | Invalidate the current token |

**Register / Login request body:**
```json
{
  "email": "john@example.com",
  "password": "secret123",
  "name": "John Doe"
}
```

**Successful response:**
```json
{
  "user": { "name": "John Doe", "email": "john@example.com", "id": "..." },
  "token": "<jwt>"
}
```

---

### Accounts

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/account` | ✓ | Create a new bank account |
| `GET` | `/account` | ✓ | Get all accounts for the logged-in user |
| `GET` | `/account/balance/:accountId` | ✓ | Get current balance (derived from ledger) |

**Create account request body:**
```json
{
  "accountType": "savings",
  "currency": "INR"
}
```

`accountType` must be `"savings"` or `"checking"`. Each user can have at most one of each type (enforced by a composite DB index).

---

### Transactions

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/transaction` | ✓ | Transfer funds between accounts |
| `POST` | `/transaction/system/initial-funds` | System user only | Seed initial balance into an account |

**Transfer request body:**
```json
{
  "fromAccount": "<accountId>",
  "toAccount": "<accountId>",
  "amount": 500,
  "idempotencyKey": "<unique-string-per-transfer>"
}
```

The `idempotencyKey` must be unique per transfer attempt. If the same key is reused, the API returns the status of the original transaction instead of creating a new one.

---

## Getting Started

### Prerequisites

- Node.js v18+
- A MongoDB Atlas cluster with a **Replica Set** (required for multi-document transactions)
- A Gmail account with OAuth2 credentials configured in Google Cloud Console

### Installation

```bash
git clone <repo-url>
cd bankingSystemBackend
npm install
```

Create a `.env` file in the project root (see [Environment Variables](#environment-variables) below).

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server starts on port **4000**.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB — must be a replica set URI for transactions to work
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/bankingDB?replicaSet=atlas-xxx

# JWT — use a long, random string in production
JWT_SECRET=your-super-secret-jwt-key

# Gmail OAuth2 — set up at console.cloud.google.com
EMAIL_USER=you@gmail.com
CLIENT_ID=xxxxx.apps.googleusercontent.com
CLIENT_SECRET=GOCSPX-xxxxx
REFRESH_TOKEN=1//xxxxx

# Optional
ALLOWED_ORIGINS=http://localhost:3000,https://yourfrontend.com
LOG_LEVEL=info
NODE_ENV=development
```

> **Note:** Never commit `.env` to version control. It is already listed in `.gitignore`.

---

## Running Tests

```bash
npm test
```

Tests use Jest with fully mocked Mongoose models — no database connection required.

```
Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
```

**Test coverage:**

| Suite | Scenarios |
|---|---|
| `auth.test.js` | Duplicate email on register, successful register, user-not-found on login, wrong password, successful login, logout token blacklisting |
| `account.test.js` | Create account, fetch all accounts, balance for missing account (404), balance calculation |
| `transaction.test.js` | Invalid accounts, duplicate idempotency key, insufficient balance, frozen account, successful transfer |

---

## Architecture Highlights

### Double-Entry Bookkeeping

Every fund transfer creates two immutable ledger entries — a debit from the sender and a credit to the receiver. Account balances are never stored; they are always derived by aggregating the ledger:

```
Balance = SUM(credits) - SUM(debits)  for all ledger entries on that account
```

This means balances are always mathematically correct, and every penny is fully traceable.

### ACID Transfers with MongoDB Sessions

All writes in a fund transfer (the transaction document + two ledger entries) happen inside a MongoDB session. If any write fails, `abortTransaction()` rolls everything back atomically — it is impossible to debit one account without crediting the other.

### Logout That Actually Works

JWTs are stateless by design — once issued, they are valid until they expire. To support real logout, every issued token is stored in a `BlackList` collection when the user logs out. The auth middleware checks this collection on every request. The blacklist uses a MongoDB TTL index to auto-delete entries after 3 days, matching the JWT expiry window.

### Immutable Ledger

Ledger entries have `immutable: true` on every field in the Mongoose schema. Additionally, Mongoose pre-hooks throw an error on any update or delete operation against the ledger collection — protecting the audit trail at the application layer regardless of how the code tries to mutate it.

---

## License

ISC
