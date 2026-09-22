import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  bearer,
  createTestApp,
  rogueEs256Key,
  serviceToken,
  userToken,
  userTokenEs256,
} from './helpers/test-app.js';

describe('authentication', () => {
  let ctx: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.app.close());

  describe('user endpoints', () => {
    it('rejects requests without a token', async () => {
      const res = await ctx.app.inject({ method: 'GET', url: '/accounts/me/statement' });
      expect(res.statusCode).toBe(401);
      expect(res.json().error.code).toBe('UNAUTHORIZED');
    });

    it('rejects tokens signed with the wrong secret', async () => {
      const token = await serviceToken({ sub: 'u1', aud: 'authenticated' });
      const res = await ctx.app.inject({
        method: 'GET',
        url: '/accounts/me/statement',
        headers: bearer(token),
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects expired tokens', async () => {
      const token = await userToken('u1', { exp: Math.floor(Date.now() / 1000) - 60 });
      const res = await ctx.app.inject({
        method: 'GET',
        url: '/accounts/me/statement',
        headers: bearer(token),
      });
      expect(res.statusCode).toBe(401);
    });

    it('accepts ES256 tokens signed by a key in the Supabase JWKS', async () => {
      ctx.repository.seedAccount('es-user', 10);
      const res = await ctx.app.inject({
        method: 'GET',
        url: '/accounts/me/statement',
        headers: bearer(await userTokenEs256('es-user')),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().account.balanceCents).toBe(10);
    });

    it('rejects ES256 tokens signed by a key outside the JWKS', async () => {
      const res = await ctx.app.inject({
        method: 'GET',
        url: '/accounts/me/statement',
        headers: bearer(await userTokenEs256('es-user', await rogueEs256Key, 'other-kid')),
      });
      expect(res.statusCode).toBe(401);
    });

    it('does not accept service tokens on user endpoints', async () => {
      const res = await ctx.app.inject({
        method: 'GET',
        url: '/accounts/me/statement',
        headers: bearer(await serviceToken()),
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('internal endpoints', () => {
    const body = { accountId: '00000000-0000-4000-8000-000000000000', amountCents: 100 };

    it('rejects requests without a token', async () => {
      const res = await ctx.app.inject({ method: 'POST', url: '/internal/transactions/deposit', payload: body });
      expect(res.statusCode).toBe(401);
    });

    it('rejects user tokens', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/internal/transactions/deposit',
        payload: body,
        headers: bearer(await userToken('u1')),
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects service tokens from unknown issuers', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/internal/transactions/deposit',
        payload: body,
        headers: bearer(await serviceToken({ iss: 'rogue-service' })),
      });
      expect(res.statusCode).toBe(401);
    });

    it('rejects service tokens with the wrong audience', async () => {
      const res = await ctx.app.inject({
        method: 'POST',
        url: '/internal/transactions/deposit',
        payload: body,
        headers: bearer(await serviceToken({ aud: 'other-api' })),
      });
      expect(res.statusCode).toBe(401);
    });
  });
});
