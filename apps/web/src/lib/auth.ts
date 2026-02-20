import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request calendar read/write scope along with the default profile scopes
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // account is only populated on first sign-in
      if (account) {
        token.googleAccessToken = account.access_token;
        token.googleRefreshToken = account.refresh_token;

        // Exchange Google ID token for our own backend JWT
        try {
          const res = await fetch(`${process.env.API_URL}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: account.id_token }),
          });

          if (res.ok) {
            const data = await res.json();
            token.backendToken = data.accessToken;
            token.backendUser = data.user;

            // Store the Google refresh token server-side so the backend can call
            // the Calendar API when webhooks arrive (no active user session needed).
            // Then immediately register the Calendar watch so notifications start flowing.
            if (account.refresh_token) {
              await fetch(`${process.env.API_URL}/calendar/watch/refresh-token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${data.accessToken}`,
                },
                body: JSON.stringify({ refreshToken: account.refresh_token }),
              }).catch((err) => console.error('Failed to store refresh token on backend:', err));

              await fetch(`${process.env.API_URL}/calendar/watch`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${data.accessToken}`,
                },
              }).catch((err) => console.error('Failed to create calendar watch on backend:', err));
            }
          } else {
            console.error('Backend auth failed:', await res.text());
          }
        } catch (err) {
          console.error('Failed to exchange token with backend:', err);
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.googleAccessToken = token.googleAccessToken ?? '';
      session.googleRefreshToken = token.googleRefreshToken ?? '';
      session.backendToken = token.backendToken ?? '';
      session.backendUser = token.backendUser ?? {
        id: '',
        email: session.user?.email ?? '',
        name: session.user?.name ?? null,
        pictureUrl: session.user?.image ?? null,
      };
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
});
