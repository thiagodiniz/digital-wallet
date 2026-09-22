import type { FastifyReply, FastifyRequest, onRequestAsyncHookHandler } from 'fastify';
import fp from 'fastify-plugin';
import { jwtVerify, type JWTPayload } from 'jose';

export interface AuthOptions {
  /** Secret used by Supabase Auth to sign end-user access tokens. */
  userJwtSecret: string;
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

const ALGORITHMS = ['HS256'];

export const authPlugin = fp<AuthOptions>(async (app, opts) => {
  const userKey = new TextEncoder().encode(opts.userJwtSecret);
  const serviceKey = new TextEncoder().encode(opts.serviceJwtSecret);

  app.decorateRequest('user', null);
  app.decorateRequest('service', null);

  app.decorate('authenticateUser', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { payload } = await jwtVerify(extractBearer(request), userKey, {
        algorithms: ALGORITHMS,
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
        algorithms: ALGORITHMS,
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
