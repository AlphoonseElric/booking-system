'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { Booking, apiClient, UnauthorizedError } from '@/lib/api-client';
import { useTheme } from '@/lib/theme-context';

interface BookingListProps {
  bookings: Booking[];
  backendToken: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  onCancelled: () => void;
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDuration = (start: string, end: string) => {
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const isUpcoming = (startTime: string) => new Date(startTime) > new Date();

const CARD_COLORS = [
  { accent: 'border-l-violet-400', dateText: 'text-violet-500', badge: 'bg-violet-100 text-violet-700', darkBadge: 'bg-violet-900/50 text-violet-300' },
  { accent: 'border-l-blue-400',   dateText: 'text-blue-500',   badge: 'bg-blue-100 text-blue-700',     darkBadge: 'bg-blue-900/50 text-blue-300'     },
  { accent: 'border-l-emerald-400',dateText: 'text-emerald-500',badge: 'bg-emerald-100 text-emerald-700',darkBadge: 'bg-emerald-900/50 text-emerald-300'},
  { accent: 'border-l-amber-400',  dateText: 'text-amber-500',  badge: 'bg-amber-100 text-amber-700',   darkBadge: 'bg-amber-900/50 text-amber-300'   },
  { accent: 'border-l-rose-400',   dateText: 'text-rose-500',   badge: 'bg-rose-100 text-rose-700',     darkBadge: 'bg-rose-900/50 text-rose-300'     },
];

const PAST_COLOR = {
  accent: 'border-l-zinc-700',
  dateText: 'text-zinc-500',
  badge: 'bg-gray-100 text-gray-500',
  darkBadge: 'bg-zinc-800 text-zinc-500',
};

function getCardColor(id: string, isPast: boolean) {
  if (isPast) return PAST_COLOR;
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CARD_COLORS[hash % CARD_COLORS.length];
}

export function BookingList({
  bookings,
  backendToken,
  googleAccessToken,
  googleRefreshToken,
  onCancelled,
}: BookingListProps) {
  const { isDark } = useTheme();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking? This will also remove the event from your Google Calendar.')) return;
    setCancellingId(id); setError(null);
    try {
      await apiClient.cancelBooking(backendToken, id, googleAccessToken, googleRefreshToken);
      onCancelled();
    } catch (err: unknown) {
      if (err instanceof UnauthorizedError) { signOut({ callbackUrl: '/' }); return; }
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  // ── Theme classes ──────────────────────────────────────
  const emptyCard  = isDark ? 'bg-zinc-900 border-zinc-800'     : 'bg-white border-gray-100';
  const emptyIcon  = isDark ? 'bg-zinc-800 text-zinc-600'       : 'bg-gray-100 text-gray-400';
  const emptyTitle = isDark ? 'text-zinc-300'                   : 'text-gray-700';
  const emptySub   = isDark ? 'text-zinc-600'                   : 'text-gray-400';
  const secLabel   = isDark ? 'text-zinc-500'                   : 'text-gray-500';
  const errBanner  = isDark ? 'bg-red-950/50 border-red-800 text-red-400' : 'bg-red-50 border-red-200 text-red-700';

  if (bookings.length === 0) {
    return (
      <div className={`rounded-2xl border p-12 text-center transition-colors duration-200 ${emptyCard}`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${emptyIcon}`}>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className={`font-semibold ${emptyTitle}`}>No bookings yet</p>
        <p className={`text-sm mt-1 ${emptySub}`}>Create your first booking using the form</p>
      </div>
    );
  }

  const upcoming = bookings.filter((b) => isUpcoming(b.startTime));
  const past     = bookings.filter((b) => !isUpcoming(b.startTime));

  return (
    <div className="space-y-5">
      {error && (
        <div className={`rounded-xl p-4 text-sm border flex items-start gap-2 ${errBanner}`}>
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {error}
        </div>
      )}

      {upcoming.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-violet-500 flex-shrink-0" />
            <h3 className={`text-xs font-bold uppercase tracking-widest ${secLabel}`}>
              Upcoming · {upcoming.length}
            </h3>
          </div>
          <div className="space-y-2">
            {upcoming.map((b) => (
              <BookingCard key={b.id} booking={b}
                onCancel={handleCancel} cancelling={cancellingId === b.id} isPast={false} isDark={isDark} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3 mt-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isDark ? 'bg-zinc-700' : 'bg-gray-300'}`} />
            <h3 className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
              Past · {past.length}
            </h3>
          </div>
          <div className="space-y-2">
            {past.map((b) => (
              <BookingCard key={b.id} booking={b}
                onCancel={handleCancel} cancelling={cancellingId === b.id} isPast={true} isDark={isDark} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BookingCard({
  booking, onCancel, cancelling, isPast, isDark,
}: {
  booking: Booking; onCancel: (id: string) => void;
  cancelling: boolean; isPast: boolean; isDark: boolean;
}) {
  const start = new Date(booking.startTime);
  const color = getCardColor(booking.id, isPast);

  const card     = isDark ? 'bg-zinc-900 border-zinc-800'     : 'bg-white border-gray-100';
  const titleTxt = isDark ? (isPast ? 'text-zinc-600' : 'text-zinc-100') : (isPast ? 'text-gray-500' : 'text-gray-900');
  const timeTxt  = isDark ? 'text-zinc-600'                   : 'text-gray-400';
  const divider  = isDark ? 'bg-zinc-800'                     : 'bg-gray-100';
  const cancelBtn= isDark ? 'text-zinc-700 hover:text-red-400 hover:bg-red-950/40' : 'text-gray-300 hover:text-red-500 hover:bg-red-50';
  const badge    = isDark ? color.darkBadge                   : color.badge;
  const syncTxt  = isDark ? 'text-emerald-500'                : 'text-emerald-600';

  return (
    <div className={`rounded-xl border border-l-4 ${color.accent} ${card} p-4 flex items-center gap-4 hover:shadow-sm transition-all duration-200 ${isPast ? 'opacity-55' : ''}`}>
      {/* Date badge */}
      <div className="flex-shrink-0 text-center w-10">
        <div className={`text-2xl font-bold leading-none ${color.dateText}`}>{start.getDate()}</div>
        <div className={`text-[11px] font-semibold uppercase tracking-wide mt-0.5 ${timeTxt}`}>
          {MONTHS_SHORT[start.getMonth()]}
        </div>
      </div>

      {/* Divider */}
      <div className={`w-px h-10 flex-shrink-0 ${divider}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold truncate ${titleTxt}`}>{booking.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs ${timeTxt}`}>
            {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
          </span>
          <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md ${badge}`}>
            {formatDuration(booking.startTime, booking.endTime)}
          </span>
          {booking.googleEventId && (
            <span className={`text-[11px] font-medium flex items-center gap-1 ${syncTxt}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Synced
            </span>
          )}
        </div>
      </div>

      {/* Cancel */}
      {!isPast && (
        <button onClick={() => onCancel(booking.id)} disabled={cancelling}
          className={`flex-shrink-0 p-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${cancelBtn}`}
          title="Cancel booking">
          {cancelling ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
