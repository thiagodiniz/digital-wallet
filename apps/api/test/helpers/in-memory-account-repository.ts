import { randomUUID } from 'node:crypto';
import type {
  AccountRepository,
  PostTransactionInput,
  StatementQuery,
} from '../../src/domain/account-repository.js';
import {
  AccountNotFoundError,
  DuplicateTransactionError,
  InsufficientFundsError,
} from '../../src/domain/errors.js';
import { toSignedAmount, type Account, type Transaction } from '../../src/domain/transaction.js';

/** Mirrors the guarantees of the Postgres `post_transaction` function. */
export class InMemoryAccountRepository implements AccountRepository {
  private readonly accounts = new Map<string, Account>();
  private readonly transactions: Transaction[] = [];
  private clock = Date.parse('2026-01-01T00:00:00.000Z');

  seedAccount(ownerId: string, balanceCents = 0): Account {
    const account: Account = { id: randomUUID(), ownerId, balanceCents };
    this.accounts.set(account.id, account);
    return account;
  }

  async findByOwner(ownerId: string): Promise<Account | null> {
    return [...this.accounts.values()].find((a) => a.ownerId === ownerId) ?? null;
  }

  async findById(accountId: string): Promise<Account | null> {
    return this.accounts.get(accountId) ?? null;
  }

  async listTransactions(accountId: string, query: StatementQuery): Promise<Transaction[]> {
    return this.transactions
      .filter((t) => t.accountId === accountId)
      .filter((t) => !query.before || t.createdAt < query.before)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, query.limit);
  }

  async postTransaction(input: PostTransactionInput): Promise<Transaction> {
    const account = this.accounts.get(input.accountId);
    if (!account) throw new AccountNotFoundError(input.accountId);

    if (
      input.referenceId &&
      this.transactions.some((t) => t.accountId === input.accountId && t.referenceId === input.referenceId)
    ) {
      throw new DuplicateTransactionError(input.referenceId);
    }

    const signed = toSignedAmount(input.type, input.amountCents);
    if (account.balanceCents + signed < 0) throw new InsufficientFundsError();

    account.balanceCents += signed;
    const transaction: Transaction = {
      id: randomUUID(),
      accountId: input.accountId,
      type: input.type,
      amountCents: signed,
      description: input.description ?? null,
      counterpartyAccountId: input.counterpartyAccountId ?? null,
      referenceId: input.referenceId ?? null,
      createdAt: new Date((this.clock += 1000)).toISOString(),
    };
    this.transactions.push(transaction);
    return transaction;
  }
}
