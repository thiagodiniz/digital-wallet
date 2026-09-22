import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Statement } from '../../api/wallet-api';
import { fakeAuth, fakeWalletApi, renderWithProviders } from '../../test/render';
import { StatementPage } from './StatementPage';

const statement: Statement = {
  account: { id: 'acc-1', ownerId: 'user-1', balanceCents: 123456 },
  transactions: [
    tx('t1', 'transfer_in', 5000, 'From Bob', '2026-03-04T10:00:00Z'),
    tx('t2', 'withdrawal', -2000, 'ATM', '2026-03-03T10:00:00Z'),
    tx('t3', 'transfer_out', -1500, null, '2026-03-02T10:00:00Z'),
    tx('t4', 'deposit', 100000, 'Salary', '2026-03-01T10:00:00Z'),
  ],
};

function tx(
  id: string,
  type: Statement['transactions'][number]['type'],
  amountCents: number,
  description: string | null,
  createdAt: string,
) {
  return { id, accountId: 'acc-1', type, amountCents, description, counterpartyAccountId: null, referenceId: null, createdAt };
}

describe('StatementPage', () => {
  it('renders the balance and every transaction type with signed amounts', async () => {
    renderWithProviders(<StatementPage />, {
      api: fakeWalletApi({ getStatement: vi.fn(async () => statement) }),
    });

    expect(await screen.findByText('$1,234.56')).toBeInTheDocument();

    const rows = screen.getAllByTestId('transaction-row');
    expect(rows).toHaveLength(4);
    expect(within(rows[0]!).getByText('Transfer in')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('+$50.00')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Withdrawal')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('−$20.00')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Transfer out')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('—')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Deposit')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('+$1,000.00')).toBeInTheDocument();
  });

  it('shows an empty state when there are no transactions', async () => {
    renderWithProviders(<StatementPage />);
    expect(await screen.findByText(/no transactions yet/i)).toBeInTheDocument();
  });

  it('shows an error with retry when the API fails, then recovers', async () => {
    const getStatement = vi
      .fn<() => Promise<Statement>>()
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce(statement);
    renderWithProviders(<StatementPage />, { api: fakeWalletApi({ getStatement }) });

    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');

    await userEvent.setup().click(screen.getByRole('button', { name: /retry/i }));

    expect(await screen.findByText('$1,234.56')).toBeInTheDocument();
    expect(getStatement).toHaveBeenCalledTimes(2);
  });

  it('signs the user out', async () => {
    const auth = fakeAuth();
    renderWithProviders(<StatementPage />, { auth });

    await userEvent.setup().click(screen.getByRole('button', { name: /sign out/i }));

    expect(auth.signOut).toHaveBeenCalled();
  });
});
