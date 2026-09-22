import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AccountRepository,
  PostTransactionInput,
  StatementQuery,
} from '../../domain/account-repository.js';
import {
  AccountNotFoundError,
  DuplicateTransactionError,
  InsufficientFundsError,
} from '../../domain/errors.js';
import type { Account, Transaction, TransactionType } from '../../domain/transaction.js';

interface AccountRow {
  id: string;
  owner_id: string;
  balance_cents: number;
}

interface TransactionRow {
  id: string;
  account_id: string;
  type: TransactionType;
  amount_cents: number;
  description: string | null;
  counterparty_account_id: string | null;
  reference_id: string | null;
  created_at: string;
}

const PG_UNIQUE_VIOLATION = '23505';
const PG_CHECK_VIOLATION = '23514';

export class SupabaseAccountRepository implements AccountRepository {
  constructor(private readonly db: SupabaseClient) {}

  async findByOwner(ownerId: string): Promise<Account | null> {
    const { data, error } = await this.db
      .from('accounts')
      .select('id, owner_id, balance_cents')
      .eq('owner_id', ownerId)
      .maybeSingle<AccountRow>();
    if (error) throw error;
    return data ? toAccount(data) : null;
  }

  async findById(accountId: string): Promise<Account | null> {
    const { data, error } = await this.db
      .from('accounts')
      .select('id, owner_id, balance_cents')
      .eq('id', accountId)
      .maybeSingle<AccountRow>();
    if (error) throw error;
    return data ? toAccount(data) : null;
  }

  async listTransactions(accountId: string, query: StatementQuery): Promise<Transaction[]> {
    let request = this.db
      .from('transactions')
      .select('id, account_id, type, amount_cents, description, counterparty_account_id, reference_id, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(query.limit);
    if (query.before) request = request.lt('created_at', query.before);

    const { data, error } = await request.returns<TransactionRow[]>();
    if (error) throw error;
    return data.map(toTransaction);
  }

  async postTransaction(input: PostTransactionInput): Promise<Transaction> {
    const { data, error } = await this.db
      .rpc('post_transaction', {
        p_account_id: input.accountId,
        p_type: input.type,
        p_amount_cents: input.amountCents,
        p_description: input.description ?? null,
        p_counterparty_account_id: input.counterpartyAccountId ?? null,
        p_reference_id: input.referenceId ?? null,
      })
      .single<TransactionRow>();

    if (error) throw translatePostError(error, input);
    return toTransaction(data);
  }
}

function translatePostError(
  error: { code?: string; message: string },
  input: PostTransactionInput,
): Error {
  if (error.code === PG_UNIQUE_VIOLATION && input.referenceId) {
    return new DuplicateTransactionError(input.referenceId);
  }
  if (error.code === PG_CHECK_VIOLATION || /insufficient funds/i.test(error.message)) {
    return new InsufficientFundsError();
  }
  if (/account not found/i.test(error.message)) {
    return new AccountNotFoundError(input.accountId);
  }
  return Object.assign(new Error(error.message), { cause: error });
}

function toAccount(row: AccountRow): Account {
  return { id: row.id, ownerId: row.owner_id, balanceCents: row.balance_cents };
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    accountId: row.account_id,
    type: row.type,
    amountCents: row.amount_cents,
    description: row.description,
    counterpartyAccountId: row.counterparty_account_id,
    referenceId: row.reference_id,
    createdAt: row.created_at,
  };
}
