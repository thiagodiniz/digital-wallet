import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bearer, createTestApp, userToken } from './helpers/test-app.js';

describe('GET /accounts/me/statement', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    ctx = await createTestApp();
  });
  afterEach(() => ctx.app.close());

  it('returns the balance and transactions of the authenticated user, newest first', async () => {
    const account = ctx.repository.seedAccount('user-1');
    const other = ctx.repository.seedAccount('user-2', 9000);
    await ctx.repository.postTransaction({ accountId: account.id, type: 'deposit', amountCents: 1000 });
    await ctx.repository.postTransaction({ accountId: account.id, type: 'withdrawal', amountCents: 250 });
    await ctx.repository.postTransaction({
      accountId: account.id,
      type: 'transfer_in',
      amountCents: 500,
      counterpartyAccountId: other.id,
    });
    await ctx.repository.postTransaction({ accountId: other.id, type: 'deposit', amountCents: 1 });

    const res = await ctx.app.inject({
      method: 'GET',
      url: '/accounts/me/statement',
      headers: bearer(await userToken('user-1')),
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.account).toMatchObject({ id: account.id, balanceCents: 1250 });
    expect(body.transactions.map((t: { type: string }) => t.type)).toEqual([
      'transfer_in',
      'withdrawal',
      'deposit',
    ]);
    expect(body.transactions[0].counterpartyAccountId).toBe(other.id);
  });

  it('supports limit and cursor pagination', async () => {
    const account = ctx.repository.seedAccount('user-1');
    for (let i = 0; i < 5; i++) {
      await ctx.repository.postTransaction({ accountId: account.id, type: 'deposit', amountCents: i + 1 });
    }
    const headers = bearer(await userToken('user-1'));

    const first = await ctx.app.inject({ method: 'GET', url: '/accounts/me/statement?limit=2', headers });
    const page1 = first.json().transactions;
    expect(page1).toHaveLength(2);

    const cursor = encodeURIComponent(page1[1].createdAt);
    const second = await ctx.app.inject({
      method: 'GET',
      url: `/accounts/me/statement?limit=2&before=${cursor}`,
      headers,
    });
    const page2 = second.json().transactions;
    expect(page2).toHaveLength(2);
    expect(page2[0].amountCents).toBe(3);
  });

  it('rejects an out-of-range limit', async () => {
    ctx.repository.seedAccount('user-1');
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/accounts/me/statement?limit=500',
      headers: bearer(await userToken('user-1')),
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when the user has no account yet', async () => {
    const res = await ctx.app.inject({
      method: 'GET',
      url: '/accounts/me/statement',
      headers: bearer(await userToken('ghost')),
    });
    expect(res.statusCode).toBe(404);
  });
});
