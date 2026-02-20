# Architecture — Booking System

## Overview

The backend follows **Clean Architecture** (Robert C. Martin). Dependencies only point
inward — infrastructure knows about application, application knows only domain, domain
knows nothing external.

```
┌──────────────────────────────────────────────────────┐
│  Infrastructure (Prisma, Google Calendar, HTTP/REST)  │
│  ┌────────────────────────────────────────────────┐  │
│  │  Application (Use Cases, DTOs)                 │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │  Domain (Entities, Repository Ports,     │  │  │
│  │  │          Service Ports)                  │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js 14)               │
│                                                      │
│  Google OAuth (next-auth) ──► Backend JWT token      │
│  Tailwind CSS UI                                     │
│  Server Components (SSR) + Client Components         │
└──────────────────┬──────────────────────────────────┘
                   │  HTTPS + JWT Bearer token
┌──────────────────▼──────────────────────────────────┐
│                  BACKEND (NestJS)                    │
│                                                      │
│  AuthModule ──► Validates Google id_token            │
│                 Issues own JWT                       │
│                                                      │
│  BookingsModule                                      │
│    └── ConflictManager ──► Promise.all([             │
│             PrismaBookingRepository.findOverlapping  │
│             GoogleCalendarService.checkConflicts     │
│         ])                                           │
└──────────────────┬──────────────────────────────────┘
         ┌─────────┴─────────┐
         ▼                   ▼
    SQLite (Prisma)    Google Calendar API v3
```

## Backend Layer Breakdown

### 1. Domain Layer (`src/domain/`) — Zero External Dependencies

Pure TypeScript. No NestJS, no Prisma, no Google imports.

**Entities** — core business objects:
```
user.entity.ts     → User class (id, email, googleId, name, pictureUrl)
booking.entity.ts  → Booking class with:
                       .overlaps(start, end): boolean
                       .isOwnedBy(userId): boolean
```

**Ports (Interfaces)** — contracts that infrastructure must implement:
```
repositories/
  user.repository.interface.ts     → IUserRepository (findByGoogleId, findById, upsert)
  booking.repository.interface.ts  → IBookingRepository (findOverlapping, create, findAllByUser,
                                                          findById, delete, updateGoogleEventId)
services/
  calendar.service.interface.ts    → ICalendarService (checkConflicts, createEvent, deleteEvent)
```

All ports use `Symbol` injection tokens to avoid string-based DI collisions:
```typescript
export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');
export const CALENDAR_SERVICE   = Symbol('CALENDAR_SERVICE');
```

---

### 2. Application Layer (`src/application/`) — Business Rules

Depends only on domain interfaces. Never imports Prisma or googleapis directly.

**Use Cases:**

| File | Responsibility |
|------|---------------|
| `auth/google-auth.use-case.ts` | Verify Google id_token via OAuth2Client, upsert User in DB, emit backend JWT |
| `bookings/check-availability.use-case.ts` | **Conflict Manager** — runs DB + GCal checks in parallel |
| `bookings/create-booking.use-case.ts` | Re-validate, persist in DB, create GCal event, rollback DB if GCal fails |
| `bookings/get-user-bookings.use-case.ts` | Fetch all bookings for authenticated user |
| `bookings/cancel-booking.use-case.ts` | Verify ownership, delete GCal event (soft fail), delete DB record |

**Conflict Manager — Core Logic:**
```typescript
// check-availability.use-case.ts
const [dbConflicts, calendarConflicts] = await Promise.all([
  this.bookingRepository.findOverlapping(userId, startTime, endTime),
  this.calendarService.checkConflicts(googleAccessToken, startTime, endTime),
]);
// If either source has conflicts → slot is unavailable
// If Google Calendar is unreachable → throws 503 (never silently ignored)
```

**Create Booking — Rollback Pattern:**
```typescript
// 1. Persist in DB first
const booking = await bookingRepository.create(data);
try {
  // 2. Create event in Google Calendar
  const eventId = await calendarService.createEvent(accessToken, data);
  return bookingRepository.updateGoogleEventId(booking.id, eventId);
} catch {
  // 3. ROLLBACK: keep both systems in sync
  await bookingRepository.delete(booking.id);
  throw new ServiceUnavailableException('...');
}
```

---

### 3. Infrastructure Layer (`src/infrastructure/`) — Adapters

Implements domain ports with concrete technologies.

**Prisma Adapters (swap database by replacing these):**
```
persistence/prisma/
  prisma.service.ts              → PrismaClient lifecycle (connect/disconnect)
  prisma-user.repository.ts      → implements IUserRepository
  prisma-booking.repository.ts   → implements IBookingRepository
```

Each repository maps Prisma records to domain entities via a private `toDomain()` method.
The application layer never receives raw Prisma types.

**Overlap query (SQL-level):**
```typescript
AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }]
// A overlaps B if: A.start < B.end AND A.end > B.start
```

**Google Calendar Adapter (swap calendar provider by replacing this):**
```
google-calendar/
  google-calendar.service.ts     → implements ICalendarService
```
Creates a stateless OAuth2 client per request using the user's access_token.

**HTTP Layer:**
```
http/
  controllers/
    auth.controller.ts           → POST /auth/google
    bookings.controller.ts       → all /bookings/* endpoints
  guards/
    jwt-auth.guard.ts            → extends AuthGuard('jwt')
  strategies/
    jwt.strategy.ts              → validates JWT, loads User from DB
  decorators/
    current-user.decorator.ts    → @CurrentUser() — extracts request.user
```

---

### 4. NestJS Modules — Dependency Injection Wiring

**`prisma.module.ts`** (Global — available everywhere without importing)
```typescript
{ provide: USER_REPOSITORY,    useClass: PrismaUserRepository }
{ provide: BOOKING_REPOSITORY, useClass: PrismaBookingRepository }
```

**`bookings.module.ts`**
```typescript
// To swap calendar provider, change ONLY this line:
{ provide: CALENDAR_SERVICE, useClass: GoogleCalendarService }
```

---

## Frontend Architecture (`apps/web/src/`)

### Authentication Flow
```
1. User clicks "Continue with Google"
2. next-auth handles Google OAuth (scope: openid email profile calendar.events)
3. next-auth jwt callback (server-side):
   a. Receives Google id_token + access_token
   b. POSTs id_token to API → /auth/google
   c. Receives backend JWT
   d. Stores both tokens in next-auth session
4. All API calls: Authorization: Bearer <backendToken>
5. Calendar operations: googleAccessToken passed in request body/query
```

### Server vs Client Component Pattern
```
app/page.tsx                    → Server Component (login, redirect if auth)
app/dashboard/page.tsx          → Server Component (SSR initial data fetch)
app/dashboard/dashboard-client.tsx → Client Component (state, interactivity)
components/bookings/*.tsx       → Client Components (forms, user interactions)
```

### Key Files
```
src/lib/auth.ts          → next-auth config (providers, jwt/session callbacks)
src/lib/api-client.ts    → typed fetch wrapper for all API calls
src/types/next-auth.d.ts → TypeScript session type extensions
```

---

## How to Extend the System

### Add a new field to Booking
1. Add column to `apps/api/prisma/schema.prisma`
2. Run `cd apps/api && npx prisma migrate dev --name add_<field>`
3. Update `IBookingRepository` interface if needed
4. Update `PrismaBookingRepository.toDomain()` mapper
5. Update `CreateBookingDto` (if user-supplied)
6. Update `Booking` domain entity constructor
7. Update `api-client.ts` in the frontend

### Swap database (e.g., PostgreSQL)
1. Change `provider` in `prisma/schema.prisma` to `postgresql`
2. Update `DATABASE_URL` format
3. Run `prisma migrate dev`
4. No changes needed in application or domain layers ✓

### Swap calendar provider (e.g., Outlook Calendar)
1. Create `outlook-calendar.service.ts` implementing `ICalendarService`
2. In `bookings.module.ts`, change:
   ```typescript
   { provide: CALENDAR_SERVICE, useClass: OutlookCalendarService }
   ```
3. No changes needed in use cases or domain layers ✓
