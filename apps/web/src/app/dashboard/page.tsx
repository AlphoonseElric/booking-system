import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { DashboardClient } from './dashboard-client';
import Image from 'next/image';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.backendToken) {
    redirect('/');
  }

  // Initial fetch of bookings on the server
  const bookings = await apiClient.getUserBookings(session.backendToken).catch(() => []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="font-semibold text-gray-900">Booking System</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              {session.backendUser?.pictureUrl && (
                <Image
                  src={session.backendUser.pictureUrl}
                  alt="Profile"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-gray-700 hidden sm:block">
                {session.backendUser?.name ?? session.backendUser?.email}
              </span>
            </div>

            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-700 border border-gray-200
                           hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main content — client component handles interactivity */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">
            All time slots are checked against your Google Calendar before confirmation
          </p>
        </div>

        <DashboardClient
          initialBookings={bookings}
          backendToken={session.backendToken}
          googleAccessToken={session.googleAccessToken}
        />
      </main>
    </div>
  );
}
