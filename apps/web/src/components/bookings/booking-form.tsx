'use client';

import { useState } from 'react';
import { apiClient, AvailabilityResult } from '@/lib/api-client';

interface BookingFormProps {
  backendToken: string;
  googleAccessToken: string;
  onBookingCreated: () => void;
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
  onBookingCreated,
}: BookingFormProps) {
  const start = nowRounded();
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(toLocalDatetimeValue(start));
  const [endTime, setEndTime] = useState(toLocalDatetimeValue(end));
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetAvailability = () => {
    setAvailability(null);
    setError(null);
  };

  const handleCheck = async () => {
    setChecking(true);
    setError(null);
    setAvailability(null);

    try {
      const result = await apiClient.checkAvailability(backendToken, {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        googleAccessToken,
      });
      setAvailability(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to check availability');
    } finally {
      setChecking(false);
    }
  };

  const handleConfirm = async () => {
    if (!title.trim()) {
      setError('Please enter a booking title');
      return;
    }

    setConfirming(true);
    setError(null);

    try {
      await apiClient.createBooking(backendToken, {
        title: title.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        googleAccessToken,
      });

      // Reset form
      setTitle('');
      setAvailability(null);
      onBookingCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-5">New Booking</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Booking Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              resetAvailability();
            }}
            placeholder="e.g. Team Standup, Client Call..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => {
                setStartTime(e.target.value);
                resetAvailability();
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                resetAvailability();
              }}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 text-base
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Availability Result */}
        {availability && (
          <div
            className={`rounded-xl p-4 text-sm ${
              availability.available
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            {availability.available ? (
              <p className="font-semibold text-green-700 flex items-center gap-2">
                <span>✓</span> Time slot is available
              </p>
            ) : (
              <div className="text-red-700">
                <p className="font-semibold flex items-center gap-2 mb-2">
                  <span>✗</span> Conflicts detected — cannot book this slot
                </p>
                {availability.dbConflicts.map((c) => (
                  <p key={c.id} className="text-xs ml-5">
                    • System: <strong>{c.title}</strong> (
                    {new Date(c.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    –{' '}
                    {new Date(c.endTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    )
                  </p>
                ))}
                {availability.calendarConflicts.map((c) => (
                  <p key={c.id} className="text-xs ml-5">
                    • Google Calendar: <strong>{c.title}</strong> (
                    {new Date(c.start).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    –{' '}
                    {new Date(c.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    )
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={handleCheck}
            disabled={checking || !startTime || !endTime}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium border-2 border-blue-600
                       text-blue-600 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors"
          >
            {checking ? 'Checking...' : 'Check Availability'}
          </button>

          <button
            onClick={handleConfirm}
            disabled={confirming || !availability?.available || !title.trim()}
            className="flex-1 py-2.5 px-4 rounded-xl text-sm font-medium bg-blue-600
                       text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors"
          >
            {confirming ? 'Confirming...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}
