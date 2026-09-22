import { Link } from 'react-router-dom';
import { formatCents } from '../../lib/money';
import { useAuth } from '../auth/AuthContext';
import { TransactionRow } from './TransactionRow';
import { useStatement } from './useStatement';

export function StatementPage() {
  const { signOut } = useAuth();
  const { state, reload } = useStatement();

  return (
    <main className="page">
      <header className="header">
        <h1>Statement</h1>
        <nav>
          <Link to="/transfer">New transfer</Link>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </nav>
      </header>

      {state.status === 'loading' && <p>Loading statement…</p>}

      {state.status === 'error' && (
        <div role="alert" className="error">
          <p>{state.message}</p>
          <button type="button" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <section className="balance" aria-label="balance">
            <span>Balance</span>
            <strong>{formatCents(state.statement.account.balanceCents)}</strong>
          </section>

          {state.statement.transactions.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th className="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                {state.statement.transactions.map((t) => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </main>
  );
}
