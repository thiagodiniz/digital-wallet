import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { NotImplementedError } from '../../domain/errors.js';

export const transferRequestSchema = z.object({
  destinationAccountId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  description: z.string().max(200).optional(),
});

/**
 * User-initiated outgoing transfer. The contract is defined so the frontend
 * can integrate against it, but the backend behaviour is intentionally pending.
 */
export const transferRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/transfers',
    { onRequest: app.authenticateUser, schema: { body: transferRequestSchema } },
    async () => {
      throw new NotImplementedError('Outgoing transfer');
    },
  );
};
