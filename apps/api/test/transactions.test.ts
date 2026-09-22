import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bearer, createTestApp, serviceToken } from './helpers/test-app.js';

describe('internal transaction endpoints', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;
  let headers: Record<string, string>;

  beforeEach(async () => {
    ctx = await createTestApp();
    headers = bearer(await serviceToken());
  });
  afterEach(() => ctx.app.close());

  const post = (url: string, payload: Record<string, unknown>) =>
    ctx.app.inject({ method: 'POST', url, payload, headers }).then((res) => res);

  describe('deposit', () => {
    it('credits the account and returns the ledger entry', async () => {
      const account = ctx.repository.seedAccount('user-1');

      const res = await post('/internal/transactions/deposit', {
        accountId: account.id,
        amountCents: 2500,
        description: 'Salary',
        referenceId: 'pay-1',
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({
        accountId: account.id,
        type: 'deposit',
        amountCents: 2500,
        description: 'Salary',
        referenceId: 'pay-1',
      });
      expect((await ctx.repository.findById(account.id))?.balanceCents).toBe(2500);
    });

    it('is idempotent per referenceId', async () => {
      const account = ctx.repository.seedAccount('user-1');
      const payload = { accountId: account.id, amountCents: 100, referenceId: 'dup' };

      await post('/internal/transactions/deposit', payload);
      const res = await post('/internal/transactions/deposit', payload);

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('DUPLICATE_TRANSACTION');
      expect((await ctx.repository.findById(account.id))?.balanceCents).toBe(100);
    });

    it('returns 404 for unknown accounts', async () => {
      const res = await post('/internal/transactions/deposit', {
        accountId: '00000000-0000-4000-8000-000000000000',
        amountCents: 100,
      });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('ACCOUNT_NOT_FOUND');
    });

    it.each([
      ['non-positive amount', { amountCents: 0 }],
      ['fractional amount', { amountCents: 10.5 }],
      ['missing amount', {}],
      ['invalid account id', { amountCents: 10, accountId: 'nope' }],
    ])('rejects %s with 400', async (_, override) => {
      const account = ctx.repository.seedAccount('user-1');
      const res = await post('/internal/transactions/deposit', { accountId: account.id, ...override });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('withdraw', () => {
    it('debits the account', async () => {
      const account = ctx.repository.seedAccount('user-1', 1000);

      const res = await post('/internal/transactions/withdraw', { accountId: account.id, amountCents: 400 });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({ type: 'withdrawal', amountCents: -400 });
      expect((await ctx.repository.findById(account.id))?.balanceCents).toBe(600);
    });

    it('rejects overdrafts with 422 and leaves the balance untouched', async () => {
      const account = ctx.repository.seedAccount('user-1', 300);

      const res = await post('/internal/transactions/withdraw', { accountId: account.id, amountCents: 301 });

      expect(res.statusCode).toBe(422);
      expect(res.json().error.code).toBe('INSUFFICIENT_FUNDS');
      expect((await ctx.repository.findById(account.id))?.balanceCents).toBe(300);
    });
  });

  describe('transfer-in', () => {
    it('credits the destination and records the counterparty', async () => {
      const source = ctx.repository.seedAccount('user-a', 5000);
      const destination = ctx.repository.seedAccount('user-b');

      const res = await post('/internal/transactions/transfer-in', {
        accountId: destination.id,
        sourceAccountId: source.id,
        amountCents: 1500,
        referenceId: 'tr-1',
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toMatchObject({
        type: 'transfer_in',
        amountCents: 1500,
        counterpartyAccountId: source.id,
      });
      expect((await ctx.repository.findById(destination.id))?.balanceCents).toBe(1500);
    });

    it('returns 404 when the source account does not exist', async () => {
      const destination = ctx.repository.seedAccount('user-b');

      const res = await post('/internal/transactions/transfer-in', {
        accountId: destination.id,
        sourceAccountId: '00000000-0000-4000-8000-000000000000',
        amountCents: 10,
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
