const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface Booking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  googleEventId: string | null;
  userId: string;
  createdAt: string;
}

export interface AvailabilityResult {
  available: boolean;
  dbConflicts: { id: string; title: string; startTime: string; endTime: string }[];
  calendarConflicts: { id: string; title: string; start: string; end: string }[];
}

export class UnauthorizedError extends Error {
  constructor() { super('Session expired. Please sign in again.'); }
}

async function request<T>(path: string, options: RequestInit, backendToken: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${backendToken}`,
      ...options.headers,
    },
  });

  if (res.status === 401) throw new UnauthorizedError();

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiClient = {
  checkAvailability(
    backendToken: string,
    data: {
      startTime: string;
      endTime: string;
      googleAccessToken: string;
      googleRefreshToken: string;
    },
  ): Promise<AvailabilityResult> {
    return request('/bookings/check', { method: 'POST', body: JSON.stringify(data) }, backendToken);
  },

  createBooking(
    backendToken: string,
    data: {
      title: string;
      startTime: string;
      endTime: string;
      googleAccessToken: string;
      googleRefreshToken: string;
    },
  ): Promise<Booking> {
    return request('/bookings', { method: 'POST', body: JSON.stringify(data) }, backendToken);
  },

  getUserBookings(backendToken: string): Promise<Booking[]> {
    return request('/bookings', { method: 'GET' }, backendToken);
  },

  cancelBooking(
    backendToken: string,
    id: string,
    googleAccessToken: string,
    googleRefreshToken: string,
  ): Promise<void> {
    return request(
      `/bookings/${id}?googleAccessToken=${encodeURIComponent(googleAccessToken)}&googleRefreshToken=${encodeURIComponent(googleRefreshToken)}`,
      { method: 'DELETE' },
      backendToken,
    );
  },
};
