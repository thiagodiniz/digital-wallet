import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/http';
import { useWalletApi } from '../../api/WalletApiContext';
import { parseAmountToCents } from '../../lib/money';

type Feedback = { kind: 'error' | 'info'; message: string } | null;

/**
 * Skeleton for outgoing transfers. The form is wired to POST /transfers,
 * which currently answers 501 until the backend flow is implemented.
 */
export function TransferPage() {
  const api = useWalletApi();
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amountCents = parseAmountToCents(amount);
    if (amountCents === null) {
      setFeedback({ kind: 'error', message: 'Enter a valid amount greater than zero.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await api.createTransfer({
        destinationAccountId,
        amountCents,
        ...(description ? { description } : {}),
      });
      setFeedback({ kind: 'info', message: 'Transfer submitted.' });
    } catch (error) {
      setFeedback(toFeedback(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page page--narrow">
      <header className="header">
        <h1>New transfer</h1>
        <Link to="/">Back to statement</Link>
      </header>

      <form onSubmit={handleSubmit} className="form" aria-label="transfer form">
        <label>
          Destination account ID
          <input
            value={destinationAccountId}
            onChange={(e) => setDestinationAccountId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            required
          />
        </label>
        <label>
          Amount
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
          />
        </label>
        <label>
          Description (optional)
          <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
        </label>

        {feedback && (
          <p role={feedback.kind === 'error' ? 'alert' : 'status'} className={feedback.kind}>
            {feedback.message}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send transfer'}
        </button>
      </form>
    </main>
  );
}

function toFeedback(error: unknown): Feedback {
  if (error instanceof ApiError && error.status === 501) {
    return { kind: 'info', message: 'Transfers are coming soon. This feature is not available yet.' };
  }
  return { kind: 'error', message: error instanceof Error ? error.message : 'Transfer failed' };
}
