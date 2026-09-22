import { useMemo, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { createHttpClient } from '../api/http';
import { createWalletApi } from '../api/wallet-api';
import { WalletApiProvider } from '../api/WalletApiContext';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { env } from '../lib/env';
import { supabase } from '../lib/supabase';

function ApiBoundary({ children }: { children: ReactNode }) {
  const { getAccessToken } = useAuth();
  const api = useMemo(() => createWalletApi(createHttpClient(env.apiUrl, getAccessToken)), [getAccessToken]);
  return <WalletApiProvider api={api}>{children}</WalletApiProvider>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider client={supabase}>
        <ApiBoundary>{children}</ApiBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}
