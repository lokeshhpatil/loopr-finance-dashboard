# Financial Dashboard API

A full-stack financial dashboard project with a TypeScript/Express API for authentication, transaction exploration, analytics, and CSV export. The backend is designed to support a React/Vite frontend and can also be evaluated directly through Postman or Swagger UI.

## What This Project Demonstrates

- JWT-based authentication with access and refresh tokens
- HTTP-only refresh-token cookies
- Protected transaction, analytics, export, profile, and logout endpoints
- MongoDB persistence through Mongoose
- Filtered and paginated transaction queries
- Revenue, expense, status, category, and time-series analytics
- CSV export with selectable columns
- CORS configured for local frontend development
- OpenAPI documentation served by the backend

## Project Structure

```text
apps/
  backend/       Express + TypeScript API
  frontend/      React + Vite frontend
packages/
  shared-types/  Shared workspace package
```

## Tech Stack

### Backend

- Node.js
- TypeScript
- Express 5
- MongoDB and Mongoose
- JWT (`jsonwebtoken`)
- `bcryptjs` for password hashing
- `cookie-parser` for HTTP-only cookies
- `cors` for frontend access control
- Swagger UI and OpenAPI
- `tsx` for development and seed execution

### Frontend

- React 19
- TypeScript
- Vite
- ESLint

### Package Management

- pnpm workspaces

## Prerequisites

Install the following before running the project:

- Node.js 20 or newer
- pnpm 9 or newer
- MongoDB, either locally or through MongoDB Atlas

Verify the tools:

```bash
node --version
pnpm --version
```

## Environment Variables

Create `apps/backend/.env` with the following values:

```env
MONGO_URI=mongodb://127.0.0.1:27017/financial-dashboard
ACCESS_TOKEN_SECRET=replace-with-a-long-random-access-secret
REFRESH_TOKEN_SECRET=replace-with-a-different-long-random-refresh-secret
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### Environment variable reference

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | Yes | Secret used to sign 30-minute access tokens |
| `REFRESH_TOKEN_SECRET` | Yes | Secret used to sign 7-day refresh tokens |
| `PORT` | No | API port; defaults to `5000` |
| `FRONTEND_URL` | No | Allowed frontend origin; defaults to `http://localhost:5173` |
| `NODE_ENV` | No | Use `production` to enable secure cookies |

`FRONTEND_URL` may contain multiple comma-separated origins when needed:

```env
FRONTEND_URL=http://localhost:5173,http://localhost:4173
```

Use strong, unique secrets outside local development. Do not commit `.env` files or real credentials.

## Installation

From the repository root:

```bash
pnpm install
```

## Run the Backend

Open a terminal in `apps/backend`:

```bash
cd apps/backend
pnpm dev
```

The API starts at:

```text
http://localhost:5000
```

Useful URLs:

- Health check: `GET http://localhost:5000/health`
- OpenAPI JSON: `http://localhost:5000/openapi.json`
- Swagger UI: `http://localhost:5000/api-docs`

## Seed the Database

The seed script reads `apps/backend/src/seed/transactions.json`, deletes existing transactions, and inserts the seed dataset.

Run it from `apps/backend`:

```bash
cd apps/backend
pnpm seed
```

The seed script only replaces transaction documents. It does not create a user account, so create one through the signup endpoint before calling protected APIs.

## Run the Frontend

In a second terminal:

```bash
cd apps/frontend
pnpm dev
```

Vite normally serves the frontend at:

```text
http://localhost:5173
```

The backend already allows this origin by default. If the frontend runs on another origin, update `FRONTEND_URL` in `apps/backend/.env` and restart the backend.

## API Overview

All API routes use the `/api/v0` prefix.

| Method | Endpoint | Auth | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/v0/auth/signup` | Public | Create a user account |
| `POST` | `/api/v0/auth/signin` | Public | Sign in and receive tokens |
| `POST` | `/api/v0/auth/refresh-token` | Refresh token | Rotate access and refresh tokens |
| `GET` | `/api/v0/auth/profile` | Access token | Get the current user |
| `POST` | `/api/v0/auth/logout` | Access token | Revoke the stored refresh token |
| `GET` | `/api/v0/transactions` | Access token | List and filter transactions |
| `GET` | `/api/v0/analytics/summary` | Access token | Get financial totals and status summaries |
| `GET` | `/api/v0/analytics/trends` | Access token | Get time-series analytics |
| `GET` | `/api/v0/analytics/categories` | Access token | Get category and status breakdowns |
| `GET` | `/api/v0/export/transactions` | Access token | Download filtered transactions as CSV |

Protected endpoints accept either:

```http
Authorization: Bearer <access-token>
```

or the `accessToken` cookie. Refresh tokens are stored in an HTTP-only `refreshToken` cookie by the auth endpoints.

## Postman Usage

Set these collection variables in Postman:

```text
baseUrl     http://localhost:5000
accessToken
```

### 1. Create an account

```http
POST {{baseUrl}}/api/v0/auth/signup
Content-Type: application/json
```

```json
{
  "name": "Demo User",
  "email": "demo@example.com",
  "password": "strong-password"
}
```

Copy `data.accessToken` from the response into the `accessToken` collection variable. The response also sets the HTTP-only refresh-token cookie.

### 2. Sign in

```http
POST {{baseUrl}}/api/v0/auth/signin
Content-Type: application/json
```

```json
{
  "email": "demo@example.com",
  "password": "strong-password"
}
```

Copy the returned `data.accessToken` into `{{accessToken}}`.

### 3. Get the current profile

```http
GET {{baseUrl}}/api/v0/auth/profile
Authorization: Bearer {{accessToken}}
```

### 4. Query transactions

```http
GET {{baseUrl}}/api/v0/transactions?category=Expense&status=Paid&page=1&limit=20&sortBy=date&order=desc
Authorization: Bearer {{accessToken}}
```

Supported filters include `search`, `startDate`, `endDate`, `category`, `status`, `minAmount`, `maxAmount`, `user_id`, `sortBy`, `order`, `page`, and `limit`.

### 5. Query analytics

```http
GET {{baseUrl}}/api/v0/analytics/summary?startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer {{accessToken}}
```

```http
GET {{baseUrl}}/api/v0/analytics/trends?interval=month&startDate=2025-01-01&endDate=2025-12-31&fill=true
Authorization: Bearer {{accessToken}}
```

```http
GET {{baseUrl}}/api/v0/analytics/categories?groupBy=both
Authorization: Bearer {{accessToken}}
```

### 6. Export transactions as CSV

```http
GET {{baseUrl}}/api/v0/export/transactions?status=Paid&columns=id,date,amount,category,status
Authorization: Bearer {{accessToken}}
```

Postman will receive a `text/csv` response with a downloadable filename.

### 7. Refresh tokens

```http
POST {{baseUrl}}/api/v0/auth/refresh-token
```

Keep Postman cookie storage enabled so the `refreshToken` cookie is sent automatically. The response returns a new access token and rotates the refresh token.

### 8. Log out

```http
POST {{baseUrl}}/api/v0/auth/logout
Authorization: Bearer {{accessToken}}
```

## Authentication Flow

1. Sign up or sign in.
2. Store the returned access token in the client memory or Postman variable.
3. Send the access token as a bearer token to protected endpoints.
4. When the access token expires, call `/auth/refresh-token` with the HTTP-only refresh-token cookie.
5. Replace the expired access token with the newly returned token.
6. Call `/auth/logout` to invalidate the refresh token and clear auth cookies.

Access tokens expire after 30 minutes. Refresh tokens expire after 7 days.

## Development Notes

- The backend uses CORS credentials so browser clients can send authentication cookies.
- The default local frontend origin is `http://localhost:5173`.
- Transaction seed data is shared across users in the current data model; transaction ownership filtering is not enforced by user identity.
- The seed command is destructive for the transactions collection because it runs `deleteMany({})` before inserting the fixture data.
- There are currently no automated backend tests configured. Swagger UI is available for interactive API exploration.

## License

This project is currently configured without a project-specific license. Add one before distributing it publicly if required.
