import type { Account, Cents, Transaction, TransactionType } from './transaction.js';

export interface PostTransactionInput {
  accountId: string;
  type: TransactionType;
  /** Absolute (unsigned) amount in cents. */
  amountCents: Cents;
  description?: string | undefined;
  counterpartyAccountId?: string | undefined;
  referenceId?: string | undefined;
}

export interface StatementQuery {
  limit: number;
  /** ISO timestamp cursor: return transactions created strictly before it. */
  before?: string | undefined;
}

/**
 * Persistence boundary for accounts and their ledger.
 * Implementations must apply transactions atomically and reject overdrafts.
 */
export interface AccountRepository {
  findByOwner(ownerId: string): Promise<Account | null>;
  findById(accountId: string): Promise<Account | null>;
  listTransactions(accountId: string, query: StatementQuery): Promise<Transaction[]>;
  postTransaction(input: PostTransactionInput): Promise<Transaction>;
}
