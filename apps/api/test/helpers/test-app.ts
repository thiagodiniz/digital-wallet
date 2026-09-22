import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { buildApp } from '../../src/app.js';
import { InMemoryAccountRepository } from './in-memory-account-repository.js';

export const USER_JWT_SECRET = 'test-user-secret-test-user-secret-test';
export const SERVICE_JWT_SECRET = 'test-service-secret-test-service-secret';
export const SERVICE_ISSUER = 'payments-service';
export const SERVICE_AUDIENCE = 'wallet-api';

const es256 = await generateKeyPair('ES256');
const es256Kid = 'test-key';
export const userJwks = createLocalJWKSet({
  keys: [{ ...(await exportJWK(es256.publicKey)), kid: es256Kid, alg: 'ES256', use: 'sig' }],
});
export const rogueEs256Key: Promise<CryptoKey> = generateKeyPair('ES256').then((k) => k.privateKey);

export async function createTestApp() {
  const repository = new InMemoryAccountRepository();
  const app = await buildApp({
    accountRepository: repository,
    corsOrigin: ['http://localhost:5173'],
    auth: {
      supabaseUrl: 'http://127.0.0.1:54321',
      userJwtSecret: USER_JWT_SECRET,
      userJwks,
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

function userClaims(userId: string, overrides: Record<string, unknown>) {
  return { sub: userId, aud: 'authenticated', role: 'authenticated', email: 'user@example.com', ...overrides };
}

/** Mimics a legacy Supabase Auth access token (shared secret, HS256). */
export function userToken(userId: string, overrides: Record<string, unknown> = {}) {
  return sign(userClaims(userId, overrides), USER_JWT_SECRET);
}

/** Mimics a Supabase Auth access token signed with an asymmetric signing key (ES256). */
export async function userTokenEs256(userId: string, key: CryptoKey = es256.privateKey, kid = es256Kid) {
  return new SignJWT(userClaims(userId, {}))
    .setProtectedHeader({ alg: 'ES256', kid })
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

/** Mimics a token minted by a trusted microservice. */
export function serviceToken(overrides: Record<string, unknown> = {}, secret = SERVICE_JWT_SECRET) {
  return sign({ iss: SERVICE_ISSUER, aud: SERVICE_AUDIENCE, sub: 'svc', ...overrides }, secret);
}

export function bearer(token: string) {
  return { authorization: `Bearer ${token}` };
}
