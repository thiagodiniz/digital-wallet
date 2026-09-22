export class DomainError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class AccountNotFoundError extends DomainError {
  constructor(accountId: string) {
    super(`Account ${accountId} not found`, 404, 'ACCOUNT_NOT_FOUND');
  }
}

export class InsufficientFundsError extends DomainError {
  constructor() {
    super('Insufficient funds', 422, 'INSUFFICIENT_FUNDS');
  }
}

export class DuplicateTransactionError extends DomainError {
  constructor(referenceId: string) {
    super(`Transaction with reference ${referenceId} already exists`, 409, 'DUPLICATE_TRANSACTION');
  }
}

export class NotImplementedError extends DomainError {
  constructor(feature: string) {
    super(`${feature} is not implemented yet`, 501, 'NOT_IMPLEMENTED');
  }
}
