import { SignJWT } from 'jose';
import { buildApp } from '../../src/app.js';
import { InMemoryAccountRepository } from './in-memory-account-repository.js';

export const USER_JWT_SECRET = 'test-user-secret-test-user-secret-test';
export const SERVICE_JWT_SECRET = 'test-service-secret-test-service-secret';
export const SERVICE_ISSUER = 'payments-service';
export const SERVICE_AUDIENCE = 'wallet-api';

export async function createTestApp() {
  const repository = new InMemoryAccountRepository();
  const app = await buildApp({
    accountRepository: repository,
    corsOrigin: ['http://localhost:5173'],
    auth: {
      userJwtSecret: USER_JWT_SECRET,
      serviceJwtSecret: SERVICE_JWT_SECRET,
      serviceIssuers: [SERVICE_ISSUER],
      serviceAudience: SERVICE_AUDIENCE,
    },
  });
  await app.ready();
  return { app, repository };
}

function sign(payload: Record<string, unknown>, secret: string) {
  const jwt = new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt();
  if (payload.exp === undefined) jwt.setExpirationTime('5m');
  return jwt.sign(new TextEncoder().encode(secret));
}

/** Mimics a Supabase Auth access token. */
export function userToken(userId: string, overrides: Record<string, unknown> = {}) {
  return sign(
    { sub: userId, aud: 'authenticated', role: 'authenticated', email: 'user@example.com', ...overrides },
    USER_JWT_SECRET,
  );
}

/** Mimics a token minted by a trusted microservice. */
export function serviceToken(overrides: Record<string, unknown> = {}, secret = SERVICE_JWT_SECRET) {
  return sign({ iss: SERVICE_ISSUER, aud: SERVICE_AUDIENCE, sub: 'svc', ...overrides }, secret);
}

export function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}
