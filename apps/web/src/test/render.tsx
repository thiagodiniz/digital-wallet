import type { Session } from '@supabase/supabase-js';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import type { WalletApi } from '../api/wallet-api';
import { WalletApiProvider } from '../api/WalletApiContext';
import { AuthContextForTests, type AuthState } from '../features/auth/AuthContext';

export type { AuthState };

export function fakeSession(userId = 'user-1'): Session {
  return {
    access_token: 'token',
    refresh_token: 'refresh',
    token_type: 'bearer',
    expires_in: 3600,
    user: { id: userId, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' },
  } as Session;
}

export function fakeAuth(overrides: Partial<AuthState> = {}): AuthState {
  return {
    session: fakeSession(),
    loading: false,
    signIn: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
    getAccessToken: vi.fn(async () => 'token'),
    ...overrides,
  };
}

export function fakeWalletApi(overrides: Partial<WalletApi> = {}): WalletApi {
  return {
    getStatement: vi.fn(async () => ({ account: { id: 'acc', ownerId: 'user-1', balanceCents: 0 }, transactions: [] })),
    createTransfer: vi.fn(async () => {}),
    ...overrides,
  };
}

interface RenderOptions {
  auth?: AuthState;
  api?: WalletApi;
  route?: string;
  /** Extra routes to render alongside the element under test (e.g. redirect targets). */
  routes?: ReactNode;
  path?: string;
}

export function renderWithProviders(ui: ReactNode, options: RenderOptions = {}) {
  const auth = options.auth ?? fakeAuth();
  const api = options.api ?? fakeWalletApi();
  const result = render(
    <MemoryRouter initialEntries={[options.route ?? '/']}>
      <AuthContextForTests.Provider value={auth}>
        <WalletApiProvider api={api}>
          <Routes>
            <Route path={options.path ?? '/'} element={ui} />
            {options.routes}
          </Routes>
        </WalletApiProvider>
      </AuthContextForTests.Provider>
    </MemoryRouter>,
  );
  return { ...result, auth, api };
}
