import type { HttpClient } from './http';

export type TransactionType = 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amountCents: number;
  description: string | null;
  counterpartyAccountId: string | null;
  referenceId: string | null;
  createdAt: string;
}

export interface Statement {
  account: { id: string; ownerId: string; balanceCents: number };
  transactions: Transaction[];
}

export interface TransferRequest {
  destinationAccountId: string;
  amountCents: number;
  description?: string;
}

export interface WalletApi {
  getStatement(): Promise<Statement>;
  createTransfer(request: TransferRequest): Promise<void>;
}

export function createWalletApi(http: HttpClient): WalletApi {
  return {
    getStatement: () => http.get<Statement>('/accounts/me/statement'),
    createTransfer: (request) => http.post<void>('/transfers', request),
  };
}
