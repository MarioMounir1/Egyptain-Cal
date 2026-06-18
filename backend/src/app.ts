/**
 * @file app.ts
 * @description Fastify application factory.
 * Creates and configures the Fastify instance — no server binding happens here.
 * This separation allows easy testing (create app without listening).
 */

import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';

import { env } from './config/env.js';
import errorHandler from './shared/errors/errorHandler.js';
import { mealRoutes } from './modules/meals/index.js';
import { foodRoutes } from './modules/foods/index.js';
import { userRoutes } from './modules/users/index.js';
import { authRoutes } from './modules/auth/index.js';
import { sponsorRoutes } from './modules/sponsors/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'warn' : 'info',
      transport:
        env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
          : undefined,
    },
    trustProxy: true,
  });

  // ── Security ──────────────────────────────────────────────────────────────
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // handled at CDN/nginx layer
  });

  await fastify.register(cors, {
    origin: env.NODE_ENV === 'production'
      ? ['https://app.egyptain-cal.io', 'https://egyptain-cal.io']
      : true, // allow all in dev
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Rate Limiting ─────────────────────────────────────────────────────────
  await fastify.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
    errorResponseBuilder: (_req, context) => ({
      status: 'error',
      code: 'RATE_LIMIT_EXCEEDED',
      message: `Too many requests. Please retry after ${Math.ceil(context.ttl / 1000)} seconds.`,
    }),
  });

  // ── Authentication ────────────────────────────────────────────────────────
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.status(401).send({
        status: 'error',
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      });
    }
  });

  // ── Global Error Handler ──────────────────────────────────────────────────
  await fastify.register(errorHandler);

  // ── Root health check ─────────────────────────────────────────────────────
  fastify.get('/health', async (_req, reply) => {
    return reply.status(200).send({
      status: 'ok',
      service: 'egyptain-cal-api',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Module Routes ─────────────────────────────────────────────────────────
  await fastify.register(
    fp(async (app) => {
      await app.register(authRoutes, { prefix: '/api/v1/auth' });
      await app.register(mealRoutes, { prefix: '/api/v1/meals' });
      await app.register(foodRoutes, { prefix: '/api/v1/foods' });
      await app.register(userRoutes, { prefix: '/api/v1/users' });
      await app.register(sponsorRoutes, { prefix: '/api/v1/sponsors' });
    }),
  );

  return fastify;
}
