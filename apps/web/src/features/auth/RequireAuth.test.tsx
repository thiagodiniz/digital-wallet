import { screen } from '@testing-library/react';
import { Route } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { fakeAuth, renderWithProviders, type AuthState } from '../../test/render';
import { RequireAuth } from './RequireAuth';

function renderGuarded(auth: AuthState) {
  return renderWithProviders(<RequireAuth />, {
    auth,
    routes: <Route path="/login" element={<h1>Login</h1>} />,
  });
}

describe('RequireAuth', () => {
  it('redirects anonymous users to /login', () => {
    renderGuarded(fakeAuth({ session: null }));
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('shows a loading state while the session is being restored', () => {
    renderGuarded(fakeAuth({ session: null, loading: true }));
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Login' })).not.toBeInTheDocument();
  });
});
