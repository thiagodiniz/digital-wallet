import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { fakeAuth, renderWithProviders } from '../../test/render';
import { LoginPage } from './LoginPage';

const statementRoute = <Route path="/" element={<h1>Statement</h1>} />;

describe('LoginPage', () => {
  it('signs in with email and password and redirects to the statement', async () => {
    const signIn = vi.fn(async () => {});
    renderWithProviders(<LoginPage />, {
      auth: fakeAuth({ session: null, signIn }),
      route: '/login',
      path: '/login',
      routes: statementRoute,
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'ana@example.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(signIn).toHaveBeenCalledWith('ana@example.com', 'secret123');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Statement' })).toBeInTheDocument());
  });

  it('shows the error returned by the auth provider', async () => {
    const signIn = vi.fn(async () => {
      throw new Error('Invalid login credentials');
    });
    renderWithProviders(<LoginPage />, {
      auth: fakeAuth({ session: null, signIn }),
      route: '/login',
      path: '/login',
    });

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/email/i), 'ana@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login credentials');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });

  it('redirects already authenticated users away from the login page', () => {
    renderWithProviders(<LoginPage />, { route: '/login', path: '/login', routes: statementRoute });
    expect(screen.getByRole('heading', { name: 'Statement' })).toBeInTheDocument();
  });
});
