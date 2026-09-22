import type { FastifyError, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { hasZodFastifySchemaValidationErrors } from 'fastify-type-provider-zod';
import { DomainError } from '../domain/errors.js';

export const errorHandlerPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof DomainError) {
      return reply.code(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    if (hasZodFastifySchemaValidationErrors(error)) {
      const details = error.validation.map((issue) => ({
        path: issue.instancePath,
        message: issue.message,
      }));
      return reply.code(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details },
      });
    }

    if (error.statusCode && error.statusCode < 500) {
      return reply.code(error.statusCode).send({
        error: { code: error.code ?? 'BAD_REQUEST', message: error.message },
      });
    }

    request.log.error({ err: error }, 'unhandled error');
    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });
});
