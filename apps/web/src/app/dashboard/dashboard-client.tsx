'use client';

import { useState, useCallback, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { Booking, apiClient } from '@/lib/api-client';
import { ThemeProvider, useTheme } from '@/lib/theme-context';
import { BookingForm } from '@/components/bookings/booking-form';
import { BookingList } from '@/components/bookings/booking-list';
import { BookingCalendar } from '@/components/bookings/booking-calendar';

interface DashboardClientProps {
  initialBookings: Booking[];
  backendToken: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  user?: { name?: string | null; email?: string | null; pictureUrl?: string | null };
}

type ViewMode = 'list' | 'calendar';

// ── Outer shell: provides the theme context ──────────────
export function DashboardClient(props: DashboardClientProps) {
  return (
    <ThemeProvider>
      <DashboardInner {...props} />
    </ThemeProvider>
  );
}

// ── Inner shell: consumes the theme context ──────────────
function DashboardInner({
  initialBookings,
  backendToken,
  googleAccessToken,
  googleRefreshToken,
  user,
}: DashboardClientProps) {
  const { isDark, toggle } = useTheme();
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showModal, setShowModal] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    if (!showModal) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowModal(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showModal]);

  const refreshBookings = useCallback(async () => {
    setRefreshing(true);
    try {
      const updated = await apiClient.getUserBookings(backendToken);
      setBookings(updated);
    } catch {
      // silently fail — stale data is better than a broken UI
    } finally {
      setRefreshing(false);
    }
  }, [backendToken]);

  // Theme shorthand
  const page    = isDark ? 'bg-zinc-950'              : 'bg-gray-50';
  const header  = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100';
  const logoBox = isDark ? 'bg-violet-600'            : 'bg-blue-600';
  const brand   = isDark ? 'text-zinc-100'            : 'text-gray-900';
  const userTxt = isDark ? 'text-zinc-400'            : 'text-gray-700';
  const signBtn = isDark ? 'text-zinc-500 border-zinc-700 hover:border-zinc-500 hover:text-zinc-300'
                         : 'text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700';
  const themeBtn = isDark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700';
  const h1      = isDark ? 'text-zinc-100'            : 'text-gray-900';
  const sub     = isDark ? 'text-zinc-500'            : 'text-gray-500';
  const viewWrap = isDark ? 'bg-zinc-800'             : 'bg-gray-100';
  const viewOn  = isDark ? 'bg-zinc-700 text-zinc-100 shadow-sm' : 'bg-white text-gray-900 shadow-sm';
  const viewOff = isDark ? 'text-zinc-500 hover:text-zinc-300'   : 'text-gray-600 hover:text-gray-900';
  const refBtn  = isDark ? 'text-violet-400 hover:text-violet-300' : 'text-blue-600 hover:text-blue-700';

  return (
    <div className={`min-h-screen transition-colors duration-200 ${page}`}>

      {/* ── Header ── */}
      <header className={`border-b sticky top-0 z-20 transition-colors duration-200 ${header}`}>
        <div className={`mx-auto px-4 sm:px-6 py-4 flex items-center justify-between ${
          viewMode === 'calendar' ? 'max-w-7xl' : 'max-w-5xl'
        }`}>
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 ${logoBox} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className={`font-bold text-sm ${brand}`}>Booking System</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Dark/Light toggle */}
            <button onClick={toggle} className={`p-2 rounded-lg transition-colors ${themeBtn}`}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* User info */}
            <div className="flex items-center gap-2">
              {user?.pictureUrl && (
                <Image src={user.pictureUrl} alt="Profile" width={32} height={32}
                  className="rounded-full" />
              )}
              <span className={`text-sm hidden sm:block ${userTxt}`}>
                {user?.name ?? user?.email}
              </span>
            </div>

            {/* Sign out */}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className={`text-sm border px-3 py-1.5 rounded-lg transition-colors ${signBtn}`}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className={`mx-auto px-4 sm:px-6 py-8 transition-all duration-200 ${
        viewMode === 'calendar' ? 'max-w-7xl' : 'max-w-5xl'
      }`}>
        {/* Page title row */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${h1}`}>My Bookings</h1>
            <p className={`text-sm mt-1 ${sub}`}>
              All time slots are checked against your Google Calendar before confirmation
            </p>
          </div>

          {/* View toggle + actions */}
          <div className="flex items-center gap-3">
            {/* New Booking button — visible in calendar mode */}
            {viewMode === 'calendar' && (
              <button
                onClick={() => setShowModal(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-violet-600 text-white hover:bg-violet-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Booking
              </button>
            )}
            <div className={`flex items-center rounded-lg p-1 ${viewWrap}`}>
              <button onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list' ? viewOn : viewOff
                }`}>
                List
              </button>
              <button onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'calendar' ? viewOn : viewOff
                }`}>
                Calendar
              </button>
            </div>
            <button onClick={refreshBookings} disabled={refreshing}
              className={`text-sm disabled:opacity-40 transition-colors ${refBtn}`}>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ── Calendar view: full width ── */}
        {viewMode === 'calendar' ? (
          <BookingCalendar bookings={bookings} />
        ) : (
          /* ── List view: form (2/5) + list (3/5) ── */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2">
              <BookingForm
                backendToken={backendToken}
                googleAccessToken={googleAccessToken}
                googleRefreshToken={googleRefreshToken}
                onBookingCreated={refreshBookings}
              />
            </div>
            <div className="lg:col-span-3">
              <BookingList
                bookings={bookings}
                backendToken={backendToken}
                googleAccessToken={googleAccessToken}
                googleRefreshToken={googleRefreshToken}
                onCancelled={refreshBookings}
              />
            </div>
          </div>
        )}
      </main>

      {/* ── New Booking Modal ── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          {/* Backdrop */}
          <div className={`absolute inset-0 ${isDark ? 'bg-black/70' : 'bg-black/40'} backdrop-blur-sm`} />

          {/* Dialog */}
          <div className={`relative w-full max-w-md rounded-2xl shadow-2xl border transition-colors duration-200 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'
          }`}>
            {/* Modal header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${
              isDark ? 'border-zinc-800' : 'border-gray-100'
            }`}>
              <span className={`font-semibold ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>
                New Booking
              </span>
              <button
                onClick={() => setShowModal(false)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form (borderless, no title since modal has one) */}
            <div className="p-6">
              <BookingForm
                backendToken={backendToken}
                googleAccessToken={googleAccessToken}
                googleRefreshToken={googleRefreshToken}
                onBookingCreated={() => { setShowModal(false); refreshBookings(); }}
                hideTitle
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
