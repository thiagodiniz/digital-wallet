import type { Transaction, TransactionType } from '../../api/wallet-api';
import { formatCents } from '../../lib/money';

const LABELS: Record<TransactionType, string> = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  transfer_in: 'Transfer in',
  transfer_out: 'Transfer out',
};

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

export function TransactionRow({ transaction }: { transaction: Transaction }) {
  const credit = transaction.amountCents > 0;
  return (
    <tr data-testid="transaction-row">
      <td>{dateFormatter.format(new Date(transaction.createdAt))}</td>
      <td>{LABELS[transaction.type]}</td>
      <td>{transaction.description ?? '—'}</td>
      <td className={credit ? 'amount amount--credit' : 'amount amount--debit'}>
        {credit ? '+' : '−'}
        {formatCents(Math.abs(transaction.amountCents))}
      </td>
    </tr>
  );
}
