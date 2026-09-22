import type { FastifyReply, FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

export interface AuthOptions {
  /** Supabase project URL; its JWKS endpoint verifies asymmetric (ES256/RS256) user tokens. */
  supabaseUrl: string;
  /** Legacy Supabase JWT secret for projects still issuing HS256 user tokens. */
  userJwtSecret?: string | undefined;
  /** Overrides JWKS fetching (used in tests). */
  userJwks?: JWTVerifyGetKey | undefined;
  /** Shared secret used by trusted microservices calling internal endpoints. */
  serviceJwtSecret: string;
  serviceIssuers: string[];
  serviceAudience: string;
}

export interface AuthenticatedUser {
  id: string;
  email?: string | undefined;
}

export interface AuthenticatedService {
  name: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser | null;
    service: AuthenticatedService | null;
  }
  interface FastifyInstance {
    authenticateUser: onRequestAsyncHookHandler;
    authenticateService: onRequestAsyncHookHandler;
  }
}

const SYMMETRIC_ALGORITHMS = ['HS256'];
const USER_ALGORITHMS = ['HS256', 'ES256', 'RS256'];

export const authPlugin = fp<AuthOptions>(async (app, opts) => {
  const resolveUserKey = createUserKeyResolver(opts);
  const serviceKey = new TextEncoder().encode(opts.serviceJwtSecret);

  app.decorateRequest('user', null);
  app.decorateRequest('service', null);

  app.decorate('authenticateUser', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { payload } = await jwtVerify(extractBearer(request), resolveUserKey, {
        algorithms: USER_ALGORITHMS,
        audience: 'authenticated',
      });
      request.user = { id: requireSub(payload), email: stringClaim(payload, 'email') };
    } catch (error) {
      request.log.debug({ err: error }, 'user authentication failed');
      return reply.code(401).send(unauthorized('Invalid or missing user token'));
    }
  });

  app.decorate('authenticateService', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { payload } = await jwtVerify(extractBearer(request), serviceKey, {
        algorithms: SYMMETRIC_ALGORITHMS,
        issuer: opts.serviceIssuers,
        audience: opts.serviceAudience,
      });
      request.service = { name: payload.iss ?? 'unknown' };
    } catch (error) {
      request.log.debug({ err: error }, 'service authentication failed');
      return reply.code(401).send(unauthorized('Invalid or missing service token'));
    }
  });
});

/**
 * Supabase projects sign user tokens either with the legacy shared secret (HS256)
 * or with asymmetric signing keys published at /auth/v1/.well-known/jwks.json.
 * The key is chosen per token from its `alg` header.
 */
function createUserKeyResolver(opts: AuthOptions): JWTVerifyGetKey {
  const secret = opts.userJwtSecret ? new TextEncoder().encode(opts.userJwtSecret) : null;
  const jwks =
    opts.userJwks ?? createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', opts.supabaseUrl));

  return (header, token) => {
    if (header.alg === 'HS256') {
      if (!secret) throw new Error('HS256 user tokens are not accepted: SUPABASE_JWT_SECRET is not set');
      return secret;
    }
    return jwks(header, token);
  };
}

function extractBearer(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new Error('missing bearer token');
  return header.slice('Bearer '.length).trim();
}

function requireSub(payload: JWTPayload): string {
  if (!payload.sub) throw new Error('token has no subject');
  return payload.sub;
}

function stringClaim(payload: JWTPayload, name: string): string | undefined {
  const value = payload[name];
  return typeof value === 'string' ? value : undefined;
}

function unauthorized(message: string) {
  return { error: { code: 'UNAUTHORIZED', message } };
}
