import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    googleAccessToken: string;
    googleRefreshToken: string;
    backendToken: string;
    backendUser: {
      id: string;
      email: string;
      name: string | null;
      pictureUrl: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    googleAccessToken?: string;
    googleRefreshToken?: string;
    backendToken?: string;
    backendUser?: {
      id: string;
      email: string;
      name: string | null;
      pictureUrl: string | null;
    };
  }
}
