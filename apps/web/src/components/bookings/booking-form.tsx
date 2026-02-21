'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { apiClient, AvailabilityResult, UnauthorizedError } from '@/lib/api-client';
import { useTheme } from '@/lib/theme-context';

interface BookingFormProps {
  backendToken: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  onBookingCreated: () => void;
  hideTitle?: boolean;
}

const toLocalDatetimeValue = (date: Date) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

const nowRounded = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 60 - (d.getMinutes() % 60), 0, 0);
  return d;
};

export function BookingForm({
  backendToken,
  googleAccessToken,
  googleRefreshToken,
  onBookingCreated,
  hideTitle = false,
}: BookingFormProps) {
  const { isDark } = useTheme();

  const start = nowRounded();
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(toLocalDatetimeValue(start));
  const [endTime, setEndTime] = useState(toLocalDatetimeValue(end));
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetAvailability = () => { setAvailability(null); setError(null); };

  const handleCheck = async () => {
    setChecking(true); setError(null); setAvailability(null);
    try {
      const result = await apiClient.checkAvailability(backendToken, {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        googleAccessToken,
        googleRefreshToken,
      });
      setAvailability(result);
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError) { signOut({ callbackUrl: '/' }); return; }
      setError(err instanceof Error ? err.message : 'Failed to check availability');
    } finally {
      setChecking(false);
    }
  };

  const handleConfirm = async () => {
    if (!title.trim()) { setError('Please enter a booking title'); return; }
    setConfirming(true); setError(null);
    try {
      await apiClient.createBooking(backendToken, {
        title: title.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        googleAccessToken,
        googleRefreshToken,
      });
      setTitle(''); setAvailability(null);
      onBookingCreated();
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError) { signOut({ callbackUrl: '/' }); return; }
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setConfirming(false);
    }
  };

  // ── Theme classes ──────────────────────────────────────
  const card    = isDark ? 'bg-zinc-900 border-zinc-800'   : 'bg-white border-gray-100';
  const h2      = isDark ? 'text-zinc-100'                 : 'text-gray-900';
  const label   = isDark ? 'text-zinc-400'                 : 'text-gray-700';
  const input   = isDark
    ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:ring-violet-500 focus:border-violet-500'
    : 'bg-white border-gray-200 text-gray-900 focus:ring-blue-500 focus:border-transparent';

  const availBanner = isDark
    ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400'
    : 'bg-green-50 border-green-200 text-green-700';
  const conflictBanner = isDark
    ? 'bg-red-950/50 border-red-800 text-red-400'
    : 'bg-red-50 border-red-200 text-red-700';
  const errorBanner = isDark
    ? 'bg-red-950/50 border-red-800 text-red-400'
    : 'bg-red-50 border-red-200 text-red-700';

  const checkBtn = isDark
    ? 'border-2 border-violet-600 text-violet-400 hover:bg-violet-950/50 disabled:opacity-40'
    : 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 disabled:opacity-40';
  const confirmBtn = isDark
    ? 'bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40'
    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40';

  return (
    <div className={hideTitle ? '' : `rounded-2xl shadow-sm border p-6 transition-colors duration-200 ${card}`}>
      {!hideTitle && <h2 className={`text-lg font-semibold mb-5 ${h2}`}>New Booking</h2>}

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${label}`}>Booking Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); resetAvailability(); }}
            placeholder="e.g. Team Standup, Client Call…"
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${input}`}
          />
        </div>

        {/* Start time */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${label}`}>Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => { setStartTime(e.target.value); resetAvailability(); }}
            className={`w-full border rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 transition-colors ${input}`}
          />
        </div>

        {/* End time */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${label}`}>End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => { setEndTime(e.target.value); resetAvailability(); }}
            className={`w-full border rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 transition-colors ${input}`}
          />
        </div>

        {/* Availability result */}
        {availability && (
          <div className={`rounded-xl p-4 text-sm border ${availability.available ? availBanner : conflictBanner}`}>
            {availability.available ? (
              <p className="font-semibold flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Time slot is available
              </p>
            ) : (
              <div>
                <p className="font-semibold flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Conflicts detected
                </p>
                {availability.dbConflicts.map((c) => (
                  <p key={c.id} className="text-xs ml-5">
                    • System: <strong>{c.title}</strong> ({new Date(c.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(c.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </p>
                ))}
                {availability.calendarConflicts.map((c) => (
                  <p key={c.id} className="text-xs ml-5">
                    • Google Calendar: <strong>{c.title}</strong> ({new Date(c.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {new Date(c.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={`rounded-xl p-4 text-sm border ${errorBanner}`}>{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleCheck}
            disabled={checking || !startTime || !endTime}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed ${checkBtn}`}
          >
            {checking ? 'Checking…' : 'Check Availability'}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || !availability?.available || !title.trim()}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed ${confirmBtn}`}
          >
            {confirming ? 'Confirming…' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
