# Darakuta Expense Tracker

## Project type

Full-stack web application for tracking and managing expenses, with QuickBooks Online sync.

## Architecture

```
.
├── frontend/        Vue 3 SPA (Vite, TypeScript, Tailwind, Flowbite)
├── backend/         Node.js REST API (Express, TypeScript, Prisma)
├── postgres-data/   Postgres data volume (Docker)
├── uploads/         Receipt file storage (mounted into backend container)
└── docker-compose-local.yaml   Local dev stack
```

### Frontend (`frontend/`)
- Vue 3 + Vite, TypeScript
- Auth via Auth0 (`@auth0/auth0-vue`)
- UI components: Flowbite-Vue + `@vueform/multiselect`
- Main entrypoint: `src/App.vue` → `src/components/ExpensePage.vue`
- QB-related helpers: `src/expenses/expenses.ts` (`createExpensePayload`), `src/expenses/quickbooks/quickbooks.ts`

### Backend (`backend/src/`)
- Express + TypeScript, runs with `ts-node`
- Auth middleware: `express-jwt` + `jwks-rsa` validating Auth0 JWTs
- ORM: Prisma with PostgreSQL
- Routes:
  - `routes/expenseRoute.ts` — CRUD for expenses and receipts (JWT-protected)
  - `routes/quickbooksAuth.ts` — QB OAuth flow + all QB API calls (`/createExpense`, `/createTransfer`, `/getAccounts`, `/getVendors`, `/qb-expense/:id/details`, etc.)
- QB OAuth tokens are persisted in the `QuickBooksToken` Prisma model

### Database (Prisma schema)
Key models: `Expense`, `Receipt`, `ExpenseAccount`, `User`, `QuickBooksToken`

QB sync state on `Expense`: `qbQbId` (QB entity ID), `qbEntityType` (`"Expense"` | `"Transfer"`), `qbExpenseId` (legacy).

## Running locally (Docker)

```bash
docker compose -f docker-compose-local.yaml up --build
```

- Frontend: http://localhost (port 80, hot-reload via src volume mount)
- Backend:  http://localhost:8091
- Postgres: localhost:5432

Environment is configured via:
- `.env` (root) — Postgres credentials + port bindings
- `backend/.env` — DB URL, Auth0, QuickBooks credentials, `QB_ENVIRONMENT=sandbox`
- `frontend/.env.production.local` — Vite env vars (API address, Auth0 config)

## QuickBooks sandbox

`QB_ENVIRONMENT=sandbox` in `backend/.env` points all QB API calls at the Intuit sandbox.

To connect:
1. Start the stack (`docker compose -f docker-compose-local.yaml up --build`)
2. Open http://localhost, click **Connect QuickBooks**
3. Complete the OAuth flow — you'll be redirected to `http://localhost/quickbooks-callback`
4. The token is saved to the `QuickBooksToken` table and refreshed automatically

The sandbox company and credentials are managed at https://developer.intuit.com (sandbox tab).

## Key development notes

- QB route handlers in `quickbooksAuth.ts` are **not** JWT-protected (QB OAuth callback must be public); all expense routes are protected.
- `createExpensePayload` exists in both `frontend/src/expenses/expenses.ts` (used to build the request body) and `backend/src/routes/quickbooksAuth.ts` (legacy, currently unused — frontend sends the full payload).
- Receipt files are stored on disk under `uploads/` and served by the backend.
- Prisma migrations live in `backend/prisma/migrations/`.
