import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../api/http';
import { fakeWalletApi, renderWithProviders } from '../../test/render';
import { TransferPage } from './TransferPage';

const DESTINATION = '11111111-1111-4111-8111-111111111111';

async function fillAndSubmit(amount: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/destination account id/i), DESTINATION);
  await user.type(screen.getByLabelText(/amount/i), amount);
  await user.click(screen.getByRole('button', { name: /send transfer/i }));
}

describe('TransferPage', () => {
  it('renders the transfer form skeleton', () => {
    renderWithProviders(<TransferPage />);
    expect(screen.getByRole('heading', { name: /new transfer/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/destination account id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to statement/i })).toHaveAttribute('href', '/');
  });

  it('submits amounts as integer cents to the transfer endpoint', async () => {
    const { api } = renderWithProviders(<TransferPage />);

    await fillAndSubmit('12.34');

    expect(api.createTransfer).toHaveBeenCalledWith({ destinationAccountId: DESTINATION, amountCents: 1234 });
    expect(await screen.findByRole('status')).toHaveTextContent('Transfer submitted.');
  });

  it('rejects invalid amounts client-side', async () => {
    const { api } = renderWithProviders(<TransferPage />);

    await fillAndSubmit('abc');

    expect(api.createTransfer).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/valid amount/i);
  });

  it('explains that transfers are not available when the backend answers 501', async () => {
    const createTransfer = vi.fn(async () => {
      throw new ApiError(501, 'NOT_IMPLEMENTED', 'Outgoing transfer is not implemented yet');
    });
    renderWithProviders(<TransferPage />, { api: fakeWalletApi({ createTransfer }) });

    await fillAndSubmit('5');

    expect(await screen.findByRole('status')).toHaveTextContent(/coming soon/i);
  });

  it('surfaces other API errors', async () => {
    const createTransfer = vi.fn(async () => {
      throw new ApiError(422, 'INSUFFICIENT_FUNDS', 'Insufficient funds');
    });
    renderWithProviders(<TransferPage />, { api: fakeWalletApi({ createTransfer }) });

    await fillAndSubmit('5');

    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient funds');
  });
});
