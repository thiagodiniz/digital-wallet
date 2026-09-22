import type { AccountRepository, StatementQuery } from '../../domain/account-repository.js';
import { AccountNotFoundError } from '../../domain/errors.js';
import type { Statement } from '../../domain/transaction.js';

export class StatementService {
  constructor(private readonly accounts: AccountRepository) {}

  async getStatementForOwner(ownerId: string, query: StatementQuery): Promise<Statement> {
    const account = await this.accounts.findByOwner(ownerId);
    if (!account) throw new AccountNotFoundError(`owner:${ownerId}`);

    const transactions = await this.accounts.listTransactions(account.id, query);
    return { account, transactions };
  }
}
