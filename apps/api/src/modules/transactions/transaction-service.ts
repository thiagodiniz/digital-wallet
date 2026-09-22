import type { AccountRepository } from '../../domain/account-repository.js';
import { AccountNotFoundError } from '../../domain/errors.js';
import type { Cents, Transaction } from '../../domain/transaction.js';

export interface MoneyMovement {
  accountId: string;
  amountCents: Cents;
  description?: string | undefined;
  referenceId?: string | undefined;
}

export interface IncomingTransfer extends MoneyMovement {
  sourceAccountId: string;
}

/**
 * Money movements initiated by trusted microservices.
 * Business rules (overdraft, idempotency) are enforced atomically by the repository.
 */
export class TransactionService {
  constructor(private readonly accounts: AccountRepository) {}

  deposit(input: MoneyMovement): Promise<Transaction> {
    return this.accounts.postTransaction({ ...input, type: 'deposit' });
  }

  withdraw(input: MoneyMovement): Promise<Transaction> {
    return this.accounts.postTransaction({ ...input, type: 'withdrawal' });
  }

  async transferIn(input: IncomingTransfer): Promise<Transaction> {
    const source = await this.accounts.findById(input.sourceAccountId);
    if (!source) throw new AccountNotFoundError(input.sourceAccountId);

    const { sourceAccountId, ...movement } = input;
    return this.accounts.postTransaction({
      ...movement,
      type: 'transfer_in',
      counterpartyAccountId: sourceAccountId,
    });
  }
}
