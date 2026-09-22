import cors from '@fastify/cors';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { AccountRepository } from './domain/account-repository.js';
import { healthRoutes } from './modules/health/routes.js';
import { statementRoutes } from './modules/statement/routes.js';
import { StatementService } from './modules/statement/statement-service.js';
import { transactionRoutes } from './modules/transactions/routes.js';
import { TransactionService } from './modules/transactions/transaction-service.js';
import { transferRoutes } from './modules/transfers/routes.js';
import { authPlugin, type AuthOptions } from './plugins/auth.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';

export interface AppDependencies {
  accountRepository: AccountRepository;
  auth: AuthOptions;
  corsOrigin: string[];
}

export async function buildApp(
  deps: AppDependencies,
  serverOptions: FastifyServerOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify(serverOptions);
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, { origin: deps.corsOrigin });
  await app.register(errorHandlerPlugin);
  await app.register(authPlugin, deps.auth);

  await app.register(healthRoutes);
  await app.register(statementRoutes(new StatementService(deps.accountRepository)));
  await app.register(transactionRoutes(new TransactionService(deps.accountRepository)));
  await app.register(transferRoutes);

  return app;
}
