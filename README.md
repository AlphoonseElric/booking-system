# Booking System

[![Node Version](https://img.shields.io/badge/Node-20+-blue.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9+-blue.svg)](https://pnpm.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Full-stack booking system that prevents double-bookings by checking **both** a local database **and** the user's Google Calendar in real time.

**Monorepo** using pnpm workspaces + Turbo

## Tabla de Contenidos

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Google Cloud Setup](#google-cloud-setup)
- [Running Tests](#running-tests)
- [Docker](#docker)
- [CI/CD](#cicd)
- [License](#license)

## Features

- Double-booking prevention (database + Google Calendar)
- Real-time availability checking
- Google OAuth 2.0 authentication
- JWT-based API security
- Clean Architecture (Domain → Application → Infrastructure)

## Tech Stack

| Layer    | Technology                                          |
| -------- | --------------------------------------------------- |
| Backend  | NestJS 10, Prisma 5, SQLite, Passport JWT           |
| Frontend | Next.js 14 (App Router), next-auth v5, Tailwind CSS |
| Calendar | Google Calendar API v3                              |
| DevOps   | Docker, docker-compose, GitHub Actions              |

## Prerequisites

- Node.js 20+
- pnpm 9+
- Google Cloud project with Calendar API enabled

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Initialize database
cd apps/api && npx prisma generate && npx prisma db push && cd ../..

# Start development servers
pnpm dev
```

**Services:**

- Frontend: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/api/docs

## Project Structure

```
booking-system/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/             # Database schema & migrations
│   │   └── src/
│   │       ├── domain/         # Business entities & interfaces
│   │       ├── application/   # Use cases & DTOs
│   │       ├── infrastructure/ # Adapters (Prisma, Google Calendar)
│   │       └── modules/        # NestJS DI wiring
│   │
│   └── web/                    # Next.js frontend
│       └── src/
│           ├── app/            # Pages (App Router)
│           ├── components/     # React components
│           ├── lib/            # Auth & API client
│           └── types/         # TypeScript definitions
│
├── docs/                       # Documentation
├── docker-compose.yml          # Full-stack Docker setup
└── .github/workflows/         # CI/CD pipelines
```

### Clean Architecture (Backend)

```
src/
├── domain/                    # Enterprise rules (zero dependencies)
│   ├── entities/              # User, Booking
│   ├── repositories/         # Repository interfaces
│   └── services/              # Service interfaces
│
├── application/               # Application use cases
│   ├── use-cases/            # Business logic
│   └── dtos/                # Input/Output contracts
│
├── infrastructure/            # External adapters
│   ├── persistence/prisma/   # Database implementation
│   ├── google-calendar/      # Google Calendar adapter
│   └── http/                # Controllers & guards
│
└── modules/                  # NestJS DI configuration
```

## API Reference

### Authentication

| Method | Endpoint       | Description                      |
| ------ | -------------- | -------------------------------- |
| POST   | `/auth/google` | Exchange Google ID token for JWT |

```bash
# Request
curl -X POST http://localhost:3001/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken": "<google_id_token>"}'

# Response
{
  "accessToken": "<jwt>",
  "user": {"id": "...", "email": "...", "name": "..."}
}
```

### Bookings

| Method | Endpoint          | Description        |
| ------ | ----------------- | ------------------ |
| POST   | `/bookings/check` | Check availability |
| POST   | `/bookings`       | Create booking     |
| GET    | `/bookings`       | List user bookings |
| DELETE | `/bookings/:id`   | Cancel booking     |

All booking endpoints require `Authorization: Bearer <jwt>` header.

See **Swagger UI** at http://localhost:3001/api/docs for full documentation.

## Environment Variables

### Backend (`apps/api/.env`)

| Variable             | Required | Description                               |
| -------------------- | -------- | ----------------------------------------- |
| DATABASE_URL         | Yes      | SQLite path (`file:./dev.db`)             |
| JWT_SECRET           | Yes      | Random secret (`openssl rand -base64 64`) |
| GOOGLE_CLIENT_ID     | Yes      | From Google Cloud Console                 |
| GOOGLE_CLIENT_SECRET | Yes      | From Google Cloud Console                 |
| FRONTEND_URL         | Yes      | `http://localhost:3000`                   |

### Frontend (`apps/web/.env.local`)

| Variable             | Required | Description             |
| -------------------- | -------- | ----------------------- |
| NEXTAUTH_SECRET      | Yes      | Random secret           |
| NEXTAUTH_URL         | Yes      | `http://localhost:3000` |
| GOOGLE_CLIENT_ID     | Yes      | Same as backend         |
| GOOGLE_CLIENT_SECRET | Yes      | Same as backend         |
| API_URL              | Yes      | `http://localhost:3001` |
| NEXT_PUBLIC_API_URL  | Yes      | `http://localhost:3001` |

## Google Cloud Setup

1. Enable **Google Calendar API** in Google Cloud Console
2. Configure **OAuth consent screen** with scopes:
   - `userinfo.email`
   - `userinfo.profile`
   - `calendar.events`
3. Create **OAuth 2.0 credentials** (Web application):
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3001/auth/google/callback`

## Running Tests

```bash
# Unit tests
pnpm --filter @booking/api test

# With coverage
pnpm --filter @booking/api test:cov
```

## Docker

```bash
# Full stack
docker compose up --build

# Or run individually
docker build -f apps/api/Dockerfile -t booking-api .
docker build -f apps/web/Dockerfile -t booking-web .
```

## CI/CD

- **Pull Requests**: Lint → Build → Test
- **Main branch**: Build & push Docker images to GHCR

## License

MIT
