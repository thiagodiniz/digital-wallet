export const TRANSACTION_TYPES = ['deposit', 'withdrawal', 'transfer_in', 'transfer_out'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/** Amounts are always integer cents to avoid floating point drift. */
export type Cents = number;

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  /** Positive for credits, negative for debits. */
  amountCents: Cents;
  description: string | null;
  /** Counterparty account for transfers; null otherwise. */
  counterpartyAccountId: string | null;
  /** Idempotency key supplied by the originating service. */
  referenceId: string | null;
  createdAt: string;
}

export interface Account {
  id: string;
  ownerId: string;
  balanceCents: Cents;
}

export interface Statement {
  account: Account;
  transactions: Transaction[];
}

const CREDIT_TYPES: ReadonlySet<TransactionType> = new Set(['deposit', 'transfer_in']);

export function isCredit(type: TransactionType): boolean {
  return CREDIT_TYPES.has(type);
}

/** Converts an absolute amount into a signed ledger amount for the given type. */
export function toSignedAmount(type: TransactionType, absoluteCents: Cents): Cents {
  return isCredit(type) ? absoluteCents : -absoluteCents;
}
