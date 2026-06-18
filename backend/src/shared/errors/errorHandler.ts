/**
 * @file shared/errors/errorHandler.ts
 * @description Global Fastify error handler plugin.
 * Catches all errors, normalises them to a consistent JSON shape,
 * and hides internal details in production.
 */

import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AppError } from './AppError.js';
import { env } from '../../config/env.js';

function errorHandlerPlugin(fastify: FastifyInstance, _opts: object, done: () => void): void {
  fastify.setErrorHandler(
    (error: FastifyError | AppError | Error, _req: FastifyRequest, reply: FastifyReply) => {
      // ── Zod / Fastify validation errors ────────────────────────────────
      if ('validation' in error && error.validation) {
        return reply.status(400).send({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: env.NODE_ENV !== 'production' ? error.validation : undefined,
        });
      }

      // ── Our typed operational errors ────────────────────────────────────
      if (error instanceof AppError) {
        fastify.log.warn({ err: error }, `[${error.code}] ${error.message}`);
        return reply.status(error.statusCode).send({
          status: 'error',
          code: error.code,
          message: error.message,
          ...((error as unknown as { details: unknown }).details !== undefined && {
            details: (error as unknown as { details: unknown }).details,
          }),
        });
      }

      // ── Unexpected / programmer errors ─────────────────────────────────
      fastify.log.error({ err: error }, 'Unhandled error');
      return reply.status(500).send({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message:
          env.NODE_ENV === 'production'
            ? 'An unexpected error occurred. Please try again later.'
            : error.message,
        stack: env.NODE_ENV !== 'production' ? error.stack : undefined,
      });
    },
  );

  done();
}

// fp() wraps the plugin so it can access the root fastify scope
export default fp(errorHandlerPlugin, { name: 'error-handler' });
