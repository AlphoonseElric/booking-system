'use client';

import { useState } from 'react';
import { Booking, apiClient } from '@/lib/api-client';

interface BookingListProps {
  bookings: Booking[];
  backendToken: string;
  googleAccessToken: string;
  onCancelled: () => void;
}

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatDuration = (start: string, end: string) => {
  const minutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const isUpcoming = (startTime: string) => new Date(startTime) > new Date();

export function BookingList({ bookings, backendToken, googleAccessToken, onCancelled }: BookingListProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This will also remove the event from your Google Calendar.')) {
      return;
    }

    setCancellingId(id);
    setError(null);

    try {
      await apiClient.cancelBooking(backendToken, id, googleAccessToken);
      onCancelled();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
        <div className="text-gray-400 text-4xl mb-3">📅</div>
        <p className="text-gray-500 font-medium">No bookings yet</p>
        <p className="text-sm text-gray-400 mt-1">Create your first booking using the form above</p>
      </div>
    );
  }

  const upcoming = bookings.filter((b) => isUpcoming(b.startTime));
  const past = bookings.filter((b) => !isUpcoming(b.startTime));

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
      )}

      {upcoming.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
            Upcoming ({upcoming.length})
          </h3>
          <div className="space-y-3">
            {upcoming.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancel}
                cancelling={cancellingId === booking.id}
                isPast={false}
              />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 mt-6">
            Past ({past.length})
          </h3>
          <div className="space-y-3 opacity-60">
            {past.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={handleCancel}
                cancelling={cancellingId === booking.id}
                isPast={true}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
  cancelling,
  isPast,
}: {
  booking: Booking;
  onCancel: (id: string) => void;
  cancelling: boolean;
  isPast: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${isPast ? 'bg-gray-300' : 'bg-blue-500'}`} />
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{booking.title}</p>
          <p className="text-sm text-gray-500 mt-0.5">{formatDateTime(booking.startTime)}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-gray-400">
              Duration: {formatDuration(booking.startTime, booking.endTime)}
            </span>
            {booking.googleEventId && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <span>✓</span> Google Calendar
              </span>
            )}
          </div>
        </div>
      </div>

      {!isPast && (
        <button
          onClick={() => onCancel(booking.id)}
          disabled={cancelling}
          className="flex-shrink-0 text-xs text-red-500 hover:text-red-700 border border-red-200
                     hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {cancelling ? '...' : 'Cancel'}
        </button>
      )}
    </div>
  );
}
