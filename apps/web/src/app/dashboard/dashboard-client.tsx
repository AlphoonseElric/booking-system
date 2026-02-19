'use client';

import { useState, useCallback } from 'react';
import { Booking, apiClient } from '@/lib/api-client';
import { BookingForm } from '@/components/bookings/booking-form';
import { BookingList } from '@/components/bookings/booking-list';

interface DashboardClientProps {
  initialBookings: Booking[];
  backendToken: string;
  googleAccessToken: string;
}

export function DashboardClient({ initialBookings, backendToken, googleAccessToken }: DashboardClientProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Booking form — takes 2/5 on large screens */}
      <div className="lg:col-span-2">
        <BookingForm
          backendToken={backendToken}
          googleAccessToken={googleAccessToken}
          onBookingCreated={refreshBookings}
        />
      </div>

      {/* Booking list — takes 3/5 on large screens */}
      <div className="lg:col-span-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Bookings</h2>
          <button
            onClick={refreshBookings}
            disabled={refreshing}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-40"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        <BookingList
          bookings={bookings}
          backendToken={backendToken}
          googleAccessToken={googleAccessToken}
          onCancelled={refreshBookings}
        />
      </div>
    </div>
  );
}
