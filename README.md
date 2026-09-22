# Digital Wallet

A digital wallet account with a statement, built with **React** (Vite), **Fastify** and **Supabase** (Postgres + Auth). Tests use **Vitest** on both sides, with `fastify.inject` for the API and React Testing Library for the UI.

```
apps/
  api/   Fastify service (TypeScript, zod schemas, jose JWT verification)
  web/   React SPA (Vite, react-router, Supabase Auth)
supabase/
  migrations/  Schema, RLS policies and the atomic post_transaction() function
```

## Features

| Feature | Frontend | Backend |
| --- | --- | --- |
| Login (email + password via Supabase Auth) | `/login` | Supabase user JWT verified on every user endpoint |
| Statement (balance, deposits, withdrawals, transfers in/out) | `/` | `GET /accounts/me/statement` |
| Transfer (page skeleton only) | `/transfer` | `POST /transfers` → `501 Not Implemented` |
| Deposit / Withdraw / Transfer-in (service to service) | – | `POST /internal/transactions/{deposit,withdraw,transfer-in}` |

## Architecture

- **Ledger model** – `transactions` is an append-only ledger with signed integer cents. `accounts.balance_cents` is a cached balance maintained by the Postgres function `post_transaction()`, which locks the account row, rejects overdrafts and enforces idempotency via `(account_id, reference_id)`. The API never computes balances in application code.
- **Two auth realms** (`apps/api/src/plugins/auth.ts`):
  - *User endpoints* verify Supabase access tokens (HS256 with `SUPABASE_JWT_SECRET`, `aud=authenticated`).
  - *Internal endpoints* verify tokens minted by other microservices (HS256 with `SERVICE_JWT_SECRET`, `iss` in `SERVICE_JWT_ISSUERS`, `aud=SERVICE_JWT_AUDIENCE`).
- **Ports and adapters** – domain code depends on the `AccountRepository` interface; `SupabaseAccountRepository` is the production adapter and `InMemoryAccountRepository` backs the tests, so the whole HTTP layer is tested without a database.
- **Validation** – zod schemas via `fastify-type-provider-zod`; errors are returned as `{ error: { code, message } }`.
- **Frontend** – feature folders (`auth`, `statement`, `transfer`); the API client is injected through context so pages are tested with fakes.

## Getting started

### 1. Supabase

Create a project (or run `supabase start` locally) and apply the migration:

```bash
supabase db push        # or: supabase migration up (local)
```

The migration creates one wallet account per Auth user automatically via a trigger on `auth.users`.

### 2. API

```bash
cp apps/api/.env.example apps/api/.env   # fill in Supabase URL, service role key and JWT secret
npm install
npm run dev -w @digital-wallet/api        # http://localhost:3000
```

### 3. Web

```bash
cp apps/web/.env.example apps/web/.env   # Supabase URL, anon key and API URL
npm run dev -w @digital-wallet/web        # http://localhost:5173
```

Create a user in Supabase Auth (dashboard or `supabase.auth.signUp`) and sign in.

## Internal API (for other microservices)

Mint an HS256 JWT with `SERVICE_JWT_SECRET`:

```json
{ "iss": "payments-service", "aud": "wallet-api", "sub": "job-123", "exp": 1790000000 }
```

```bash
curl -X POST http://localhost:3000/internal/transactions/deposit \
  -H "Authorization: Bearer $SERVICE_TOKEN" -H 'content-type: application/json' \
  -d '{"accountId":"<uuid>","amountCents":2500,"description":"Salary","referenceId":"pay-1"}'
```

| Endpoint | Body | Notes |
| --- | --- | --- |
| `POST /internal/transactions/deposit` | `accountId, amountCents, description?, referenceId?` | 201 with the ledger entry |
| `POST /internal/transactions/withdraw` | same | 422 `INSUFFICIENT_FUNDS` on overdraft |
| `POST /internal/transactions/transfer-in` | same + `sourceAccountId` | 404 if either account is unknown |

Repeated `referenceId` for the same account returns 409 `DUPLICATE_TRANSACTION`.

## Scripts

```bash
npm test            # all workspaces
npm run lint
npm run typecheck
npm run build
```
