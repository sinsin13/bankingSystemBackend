<div align="center">

# Banking System Backend

**Production-grade financial API built with Node.js and MongoDB**

*Double-entry bookkeeping · ACID transfers · Immutable ledger · JWT authentication*

<br/>

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Jest](https://img.shields.io/badge/Tests-15%20Passing-C21325?style=for-the-badge&logo=jest&logoColor=white)

</div>

---

## Overview

A RESTful banking API that implements the same architectural patterns used in production financial systems — balances are never stored, only derived from an immutable ledger; every fund transfer is atomic; and every issued token can be properly invalidated on logout.

---

## Features

- **Double-entry bookkeeping** — account balances are always derived live from immutable debit/credit ledger entries, never stored directly
- **ACID fund transfers** — multi-document writes are wrapped in MongoDB sessions; if any step fails, everything rolls back
- **Idempotent transactions** — client-supplied `idempotencyKey` prevents duplicate charges on network retries
- **Real logout** — JWTs are blacklisted on logout and checked on every protected request
- **Immutable audit trail** — Mongoose pre-hooks block all update and delete operations on the ledger collection
- **Input validation** on every endpoint via `express-validator`
- **Rate limiting** — 10 req/15 min on auth, 20 req/min on transactions
- **Security headers** via Helmet; CORS configured; `httpOnly` + `sameSite` cookies
- **Structured logging** with Winston (file + console) and Morgan for HTTP access logs
- **Global error handler** — unhandled async errors are caught by Express 5 and returned as clean JSON
- **Email notifications** via Nodemailer + Gmail OAuth2 on register and transfer

---

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express 5 |
| Database | MongoDB Atlas (Replica Set) |
| ODM | Mongoose 9 |
| Auth | `jsonwebtoken`, `bcryptjs` |
| Validation | `express-validator` |
| Security | `helmet`, `cors`, `express-rate-limit` |
| Logging | `winston`, `morgan` |
| Email | `nodemailer` (Gmail OAuth2) |
| Testing | `jest`, `supertest` |

---

## API Reference

Base URL: `/api/v1`

<details>
<summary><strong>Auth</strong> — register, login, logout</summary>

<br/>

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/auth/register` | — | Create a new user |
| `POST` | `/auth/login` | — | Login and receive a JWT |
| `POST` | `/auth/logout` | ✓ | Blacklist the current token |

**Register / Login body**
```json
{
  "email": "john@example.com",
  "password": "secret123",
  "name": "John Doe"
}
```

**Response**
```json
{
  "user": { "name": "John Doe", "email": "john@example.com", "id": "..." },
  "token": "<jwt>"
}
```

</details>

<details>
<summary><strong>Accounts</strong> — create, list, balance</summary>

<br/>

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/account` | ✓ | Create a bank account |
| `GET` | `/account` | ✓ | List all accounts for the logged-in user |
| `GET` | `/account/balance/:accountId` | ✓ | Get current balance (derived from ledger) |

**Create account body**
```json
{
  "accountType": "savings",
  "currency": "INR"
}
```

`accountType` must be `"savings"` or `"checking"`. A composite DB index prevents a user from creating two accounts of the same type.

</details>

<details>
<summary><strong>Transactions</strong> — transfer funds</summary>

<br/>

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/transaction` | ✓ | Transfer funds between accounts |
| `POST` | `/transaction/system/initial-funds` | System only | Seed initial balance into an account |

**Transfer body**
```json
{
  "fromAccount": "<accountId>",
  "toAccount": "<accountId>",
  "amount": 500,
  "idempotencyKey": "<unique-string-per-attempt>"
}
```

If the same `idempotencyKey` is reused, the API returns the status of the original transaction instead of creating a new one.

</details>

---

## Quick Start

**Prerequisites:** Node.js 18+, a MongoDB Atlas cluster with a Replica Set enabled (required for transactions), Gmail OAuth2 credentials.

```bash
# Install dependencies
npm install

# Add your .env file (see below), then:
npm run dev     # development with auto-reload on port 4000
npm start       # production
npm test        # run the test suite
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
# MongoDB — must be a replica set URI for ACID transactions to work
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/bankingDB?replicaSet=atlas-xxx

# JWT
JWT_SECRET=your-long-random-secret-key

# Gmail OAuth2 — set up at console.cloud.google.com
EMAIL_USER=you@gmail.com
CLIENT_ID=xxxxx.apps.googleusercontent.com
CLIENT_SECRET=GOCSPX-xxxxx
REFRESH_TOKEN=1//xxxxx

# Optional
ALLOWED_ORIGINS=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=info
```

> `.env` is listed in `.gitignore` — never commit it.

---

## Tests

```bash
npm test
```

```
Test Suites: 3 passed, 3 total
Tests:       15 passed, 15 total
```

All tests mock the database layer — no real MongoDB connection needed to run them.

| Suite | What's covered |
|---|---|
| `auth.test.js` | Duplicate registration, successful register, wrong password, successful login, logout blacklisting |
| `account.test.js` | Create account, list accounts, balance not found (404), balance calculation |
| `transaction.test.js` | Invalid accounts, duplicate idempotency key, insufficient balance, frozen account, successful transfer |

---

## Architecture

For a full deep-dive into every layer — models, middleware, the transfer flow, error handling, and all design decisions — see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

<div align="center">
<sub>Built with Node.js · Express · MongoDB</sub>
</div>
