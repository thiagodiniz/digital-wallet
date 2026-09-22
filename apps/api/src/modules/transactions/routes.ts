import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { transactionSchema } from '../statement/routes.js';
import type { TransactionService } from './transaction-service.js';

const moneyMovementSchema = z.object({
  accountId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  description: z.string().max(200).optional(),
  referenceId: z.string().max(100).optional(),
});

const incomingTransferSchema = moneyMovementSchema.extend({
  sourceAccountId: z.string().uuid(),
});

const created = { 201: transactionSchema };

/** Internal endpoints consumed by other microservices; protected by service JWTs. */
export function transactionRoutes(service: TransactionService): FastifyPluginAsyncZod {
  return async (app) => {
    app.addHook('onRequest', app.authenticateService);

    app.post(
      '/internal/transactions/deposit',
      { schema: { body: moneyMovementSchema, response: created } },
      async (request, reply) => reply.code(201).send(await service.deposit(request.body)),
    );

    app.post(
      '/internal/transactions/withdraw',
      { schema: { body: moneyMovementSchema, response: created } },
      async (request, reply) => reply.code(201).send(await service.withdraw(request.body)),
    );

    app.post(
      '/internal/transactions/transfer-in',
      { schema: { body: incomingTransferSchema, response: created } },
      async (request, reply) => reply.code(201).send(await service.transferIn(request.body)),
    );
  };
}
