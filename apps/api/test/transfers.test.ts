import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bearer, createTestApp, userToken } from './helpers/test-app.js';

describe('POST /transfers', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  it('requires a user token', async () => {
    const res = await ctx.app.inject({ method: 'POST', url: '/transfers', payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it('validates the request contract', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/transfers',
      payload: { destinationAccountId: 'x', amountCents: -1 },
      headers: bearer(await userToken('user-1')),
    });
    expect(res.statusCode).toBe(400);
  });

  it('answers 501 Not Implemented for valid requests', async () => {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/transfers',
      payload: { destinationAccountId: '00000000-0000-4000-8000-000000000000', amountCents: 100 },
      headers: bearer(await userToken('user-1')),
    });
    expect(res.statusCode).toBe(501);
    expect(res.json().error.code).toBe('NOT_IMPLEMENTED');
  });
});
