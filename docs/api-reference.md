# API Reference

> Interactive documentation also available at **http://localhost:3001/api/docs** (Swagger UI)

## Base URL
```
Development: http://localhost:3001
```

## Authentication

All endpoints except `POST /auth/google` require a JWT in the `Authorization` header:
```
Authorization: Bearer <backendToken>
```

### Token Flow
```
1. Frontend obtains Google id_token via Google OAuth (next-auth)
2. POST /auth/google { idToken } → receives { accessToken, user }
3. Use accessToken as Bearer token for all subsequent requests
4. Pass googleAccessToken (from Google OAuth) in request body/query
   when an endpoint needs to interact with Google Calendar
```

---

## Endpoints

### POST `/auth/google`
Validates a Google ID token and returns a backend JWT.

**Request Body:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "clx1234abcd",
    "email": "user@gmail.com",
    "name": "John Doe",
    "pictureUrl": "https://lh3.googleusercontent.com/..."
  }
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| `400` | Missing or invalid `idToken` field |
| `401` | Google token is invalid or expired |

---

### POST `/bookings/check`
Checks slot availability. Queries the local database **and** Google Calendar in parallel.

**Headers:** `Authorization: Bearer <backendToken>`

**Request Body:**
```json
{
  "startTime": "2025-03-15T10:00:00Z",
  "endTime": "2025-03-15T11:00:00Z",
  "googleAccessToken": "ya29.a0AfH6..."
}
```

**Response `200` — Available:**
```json
{
  "available": true,
  "dbConflicts": [],
  "calendarConflicts": []
}
```

**Response `200` — Not Available:**
```json
{
  "available": false,
  "dbConflicts": [
    {
      "id": "clx5678efgh",
      "title": "Team Standup",
      "startTime": "2025-03-15T09:30:00.000Z",
      "endTime": "2025-03-15T10:30:00.000Z"
    }
  ],
  "calendarConflicts": [
    {
      "id": "google_event_id_xyz",
      "title": "Doctor Appointment",
      "start": "2025-03-15T10:00:00.000Z",
      "end": "2025-03-15T11:00:00.000Z"
    }
  ]
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| `400` | `startTime` >= `endTime`, or booking is in the past |
| `401` | Missing or invalid backend JWT |
| `503` | Google Calendar API is temporarily unavailable |

---

### POST `/bookings`
Creates a new booking. Re-validates availability at creation time (prevents race conditions),
then persists in SQLite and creates a Google Calendar event.

**Headers:** `Authorization: Bearer <backendToken>`

**Request Body:**
```json
{
  "title": "Client Demo",
  "startTime": "2025-03-15T10:00:00Z",
  "endTime": "2025-03-15T11:00:00Z",
  "googleAccessToken": "ya29.a0AfH6..."
}
```

**Validations:**
- `title`: string, 2–100 characters, required
- `startTime` / `endTime`: ISO 8601 datetime, required
- `startTime` must be before `endTime`
- `startTime` must be in the future

**Response `201`:**
```json
{
  "id": "clx9012ijkl",
  "title": "Client Demo",
  "startTime": "2025-03-15T10:00:00.000Z",
  "endTime": "2025-03-15T11:00:00.000Z",
  "googleEventId": "68rrt04fgob47i46282hki818g",
  "userId": "clx1234abcd",
  "createdAt": "2025-03-14T08:00:00.000Z"
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| `400` | Invalid input, past date, or startTime >= endTime |
| `401` | Missing or invalid backend JWT |
| `409` | Conflict with existing system booking or Google Calendar event |
| `503` | Google Calendar unavailable — booking not created (safe rollback) |

---

### GET `/bookings`
Returns all bookings for the authenticated user, ordered by `startTime` ascending.

**Headers:** `Authorization: Bearer <backendToken>`

**Response `200`:**
```json
[
  {
    "id": "clx9012ijkl",
    "title": "Client Demo",
    "startTime": "2025-03-15T10:00:00.000Z",
    "endTime": "2025-03-15T11:00:00.000Z",
    "googleEventId": "68rrt04fgob47i46282hki818g",
    "userId": "clx1234abcd",
    "createdAt": "2025-03-14T08:00:00.000Z"
  }
]
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| `401` | Missing or invalid backend JWT |

---

### DELETE `/bookings/:id`
Cancels a booking. Removes the record from the local database and deletes the corresponding
Google Calendar event. If the GCal event was already manually deleted, the cancellation
still succeeds (the GCal error is logged and ignored).

**Headers:** `Authorization: Bearer <backendToken>`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `googleAccessToken` | string | Yes | Google OAuth access token to delete the Calendar event |

**Example:**
```
DELETE /bookings/clx9012ijkl?googleAccessToken=ya29.a0AfH6...
```

**Response `204`:** No content (success)

**Error Responses:**
| Status | Description |
|--------|-------------|
| `401` | Missing or invalid backend JWT |
| `403` | The booking belongs to a different user |
| `404` | Booking not found |

---

## Data Models

### Booking
```typescript
{
  id:            string   // cuid
  title:         string   // 2-100 chars
  startTime:     string   // ISO 8601, UTC
  endTime:       string   // ISO 8601, UTC
  googleEventId: string | null  // null if GCal sync pending or failed
  userId:        string
  createdAt:     string   // ISO 8601, UTC
}
```

### User
```typescript
{
  id:         string
  email:      string
  name:       string | null
  pictureUrl: string | null
}
```

---

## Error Response Format
All errors follow NestJS's standard format:
```json
{
  "statusCode": 409,
  "message": "Booking conflicts with existing reservation: \"Team Standup\"",
  "error": "Conflict"
}
```

Validation errors (400) return an array of messages:
```json
{
  "statusCode": 400,
  "message": [
    "title should not be empty",
    "startTime must be a valid ISO 8601 date string"
  ],
  "error": "Bad Request"
}
```

---

## Testing with Swagger

1. Open **http://localhost:3001/api/docs**
2. Click **`POST /auth/google`** → **Try it out**
3. Paste a real Google ID token (obtained from the frontend after login)
4. Copy `accessToken` from the response
5. Click **Authorize** (lock icon, top right) → paste `Bearer <accessToken>`
6. All `/bookings` endpoints are now authenticated

> **Tip:** After logging in at http://localhost:3000, open DevTools → Application →
> Cookies → find the `next-auth.session-token` to inspect session data, or check the
> Network tab when the frontend makes API calls to capture the tokens.
