import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { DashboardClient } from './dashboard-client';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.backendToken) {
    redirect('/');
  }

  const bookings = await apiClient.getUserBookings(session.backendToken).catch(() => []);

  return (
    <DashboardClient
      initialBookings={bookings}
      backendToken={session.backendToken}
      googleAccessToken={session.googleAccessToken}
      googleRefreshToken={session.googleRefreshToken}
      user={session.backendUser}
    />
  );
}
