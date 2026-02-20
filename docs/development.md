# Development Guide

## Prerequisites

- Node.js 20+
- pnpm 9+ — `npm install -g pnpm@9`
- A Google Cloud project with Calendar API enabled and OAuth 2.0 credentials
  (see [Google Cloud Setup](#google-cloud-setup))

---

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Initialize the database
cd apps/api && npx prisma generate && npx prisma db push && cd ../..

# 4. Start both services
pnpm dev

> If you encounter TypeScript errors related to Prisma, run: `cd apps/api && npx prisma generate`
```

| Service    | URL                            |
| ---------- | ------------------------------ |
| Frontend   | http://localhost:3000          |
| API        | http://localhost:3001          |
| Swagger UI | http://localhost:3001/api/docs |

---

## Environment Variables

### Backend — `apps/api/.env`

| Variable               | Required | Description                                                       |
| ---------------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`         | Yes      | SQLite path. Use `file:./dev.db` (**not** `file:./prisma/dev.db`) |
| `JWT_SECRET`           | Yes      | Random string: `openssl rand -base64 64`                          |
| `JWT_EXPIRES_IN`       | No       | Token expiry, default `7d`                                        |
| `GOOGLE_CLIENT_ID`     | Yes      | From Google Cloud Console                                         |
| `GOOGLE_CLIENT_SECRET` | Yes      | From Google Cloud Console                                         |
| `PORT`                 | No       | API port, default `3001`                                          |
| `FRONTEND_URL`         | Yes      | Used for CORS. Set to `http://localhost:3000` in dev              |

### Frontend — `apps/web/.env.local`

| Variable               | Required | Description                                              |
| ---------------------- | -------- | -------------------------------------------------------- |
| `NEXTAUTH_SECRET`      | Yes      | Random string: `openssl rand -base64 32`                 |
| `NEXTAUTH_URL`         | Yes      | `http://localhost:3000` in dev                           |
| `GOOGLE_CLIENT_ID`     | Yes      | Same as backend                                          |
| `GOOGLE_CLIENT_SECRET` | Yes      | Same as backend                                          |
| `API_URL`              | Yes      | Server-side URL for the API (no `NEXT_PUBLIC_` prefix)   |
| `NEXT_PUBLIC_API_URL`  | Yes      | Client-side URL for the API (with `NEXT_PUBLIC_` prefix) |

> ⚠️ **Important:** `DATABASE_URL` must be `file:./dev.db`, not `file:./prisma/dev.db`.
> Prisma resolves SQLite paths relative to the **schema file** location, not the CWD.

---

## Google Cloud Setup

### 1. Enable Google Calendar API

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Select your project
3. **APIs & Services → Library** → search "Google Calendar API" → **Enable**

### 2. Configure OAuth Consent Screen

1. **APIs & Services → OAuth consent screen** → External
2. Add scopes: `userinfo.email`, `userinfo.profile`, `calendar.events`
3. Add your Google email as a test user

### 3. Create OAuth 2.0 Credentials

1. **APIs & Services → Credentials → Create OAuth Client ID** → Web application
2. Authorized JavaScript origins:
   ```
   http://localhost:3000
   ```
3. Authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/callback/google
   http://localhost:3001/auth/google/callback
   ```
4. Copy **Client ID** and **Client Secret** into both `.env` files

---

## Available Commands

```bash
# Root (runs both apps via Turbo)
pnpm dev          # start API (3001) + Web (3000)
pnpm build        # build both apps
pnpm lint         # lint both apps

# Backend only
pnpm --filter @booking/api dev        # start API in watch mode
pnpm --filter @booking/api build      # compile TypeScript
pnpm --filter @booking/api test       # run unit tests
pnpm --filter @booking/api test:cov   # run tests with coverage report

# Frontend only
pnpm --filter @booking/web dev        # start Next.js dev server
pnpm --filter @booking/web build      # production build

# Database (run from apps/api/)
npx prisma migrate dev --name <migration_name>  # create and apply migration
npx prisma migrate deploy                        # apply pending migrations (production)
npx prisma studio                                # open database browser UI
npx prisma generate                              # regenerate Prisma client
```

---

## Running Tests

```bash
pnpm --filter @booking/api test
```

**Test coverage:** `CheckAvailabilityUseCase` (Conflict Manager)

| Test | Scenario                                                     |
| ---- | ------------------------------------------------------------ |
| ✅   | Available when no conflicts in DB or Calendar                |
| ✅   | Blocked by DB conflict                                       |
| ✅   | Blocked by Google Calendar conflict                          |
| ✅   | Blocked when conflicts exist in both sources                 |
| ✅   | `BadRequestException` when `startTime >= endTime`            |
| ✅   | `BadRequestException` when booking is in the past            |
| ✅   | `ServiceUnavailableException` when Google Calendar API fails |

> Note: ERROR logs during tests are **expected** — they test the error path.
> The logger output is intentional and does not indicate test failures.

---

## Docker

### Local (full stack)

```bash
docker compose up --build
```

Requires a `.env` file at the project root with all variables from both `.env.example` files.

### Individual services

```bash
# Build and run API only
docker build -f apps/api/Dockerfile -t booking-api .
docker run -p 3001:3001 --env-file apps/api/.env booking-api

# Build and run Web only
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  -t booking-web .
docker run -p 3000:3000 --env-file apps/web/.env.local booking-web
```

---

## Project Structure

```
booking-system/
├── apps/
│   ├── api/                        Backend (NestJS)
│   │   ├── prisma/
│   │   │   ├── schema.prisma       Database schema
│   │   │   ├── migrations/         SQL migration history
│   │   │   └── dev.db              SQLite database (gitignored)
│   │   └── src/
│   │       ├── domain/             Core business rules
│   │       │   ├── entities/       User, Booking
│   │       │   ├── repositories/   IUserRepository, IBookingRepository (ports)
│   │       │   └── services/       ICalendarService (port)
│   │       ├── application/        Use cases + DTOs
│   │       │   ├── use-cases/
│   │       │   │   ├── auth/       GoogleAuthUseCase
│   │       │   │   └── bookings/   CheckAvailability, CreateBooking,
│   │       │   │                   GetUserBookings, CancelBooking
│   │       │   └── dtos/
│   │       ├── infrastructure/     Adapters (concrete implementations)
│   │       │   ├── persistence/    Prisma repositories
│   │       │   ├── google-calendar/ GoogleCalendarService
│   │       │   └── http/           Controllers, Guards, JWT Strategy
│   │       ├── modules/            NestJS DI wiring
│   │       ├── app.module.ts
│   │       └── main.ts             Swagger setup, CORS, ValidationPipe
│   └── web/                        Frontend (Next.js 14)
│       └── src/
│           ├── app/
│           │   ├── page.tsx            Login page (Server Component)
│           │   ├── dashboard/          Dashboard (Server + Client Components)
│           │   └── api/auth/           next-auth route handler
│           ├── components/
│           │   └── bookings/           BookingForm, BookingList
│           ├── lib/
│           │   ├── auth.ts             next-auth config
│           │   └── api-client.ts       Typed API client
│           └── types/
│               └── next-auth.d.ts      Session type extensions
├── docs/                           This documentation
├── .github/workflows/
│   ├── ci.yml                      PR validation (lint + build + test)
│   └── deploy.yml                  Deploy on merge to main
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

---

## Common Errors & Fixes

| Error                                    | Cause                                          | Fix                                                    |
| ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| `next.config.ts not supported`           | Next.js 14 requires `.mjs` or `.js`            | Use `next.config.mjs`                                  |
| DB is empty after migration              | `DATABASE_URL` path resolves to wrong location | Use `file:./dev.db` (not `./prisma/dev.db`)            |
| `pnpm: command not found`                | pnpm not installed globally                    | `npm install -g pnpm@9`                                |
| `Insufficient Permission` (GCal)         | User token lacks `calendar.events` scope       | Sign out and log in again to re-request scope          |
| CORS error                               | `FRONTEND_URL` mismatch                        | Set `FRONTEND_URL=http://localhost:3000` in API `.env` |
| `Could not delete Google Calendar event` | Event was manually deleted in GCal             | Expected warning, booking is still cancelled in DB     |
