import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { TRANSACTION_TYPES } from '../../domain/transaction.js';
import type { StatementService } from './statement-service.js';

const statementQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().datetime().optional(),
});

export const transactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  type: z.enum(TRANSACTION_TYPES),
  amountCents: z.number().int(),
  description: z.string().nullable(),
  counterpartyAccountId: z.string().nullable(),
  referenceId: z.string().nullable(),
  createdAt: z.string(),
});

const statementResponseSchema = z.object({
  account: z.object({
    id: z.string(),
    ownerId: z.string(),
    balanceCents: z.number().int(),
  }),
  transactions: z.array(transactionSchema),
});

export function statementRoutes(service: StatementService): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/accounts/me/statement',
      {
        onRequest: app.authenticateUser,
        schema: { querystring: statementQuerySchema, response: { 200: statementResponseSchema } },
      },
      async (request) => {
        const user = request.user!;
        return service.getStatementForOwner(user.id, request.query);
      },
    );
  };
}
