/**
 * @file server.ts
 * @description Application entry point. Builds the Fastify app and binds it to a port.
 * Handles graceful shutdown on SIGTERM / SIGINT.
 *
 * NOTE: dotenv MUST be the very first import so process.env is populated
 * before env.ts (Zod schema validation) runs.
 */

import 'dotenv/config';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './shared/database/pool.js';

async function start(): Promise<void> {
  const app = await buildApp();

  // ── Graceful shutdown ─────────────────────────────────────────────────────
  const gracefulShutdown = async (signal: string): Promise<void> => {
    app.log.info(`[Server] Received ${signal}. Initiating graceful shutdown…`);
    try {
      await app.close();
      await pool.end();
      app.log.info('[Server] Shutdown complete.');
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, '[Server] Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

  // ── Unhandled rejections ──────────────────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    app.log.error({ reason }, '[Server] Unhandled promise rejection');
    process.exit(1);
  });

  // ── Listen ────────────────────────────────────────────────────────────────
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`🚀 Egyptian Cal API is live → http://${env.HOST}:${env.PORT}`);
    app.log.info(`   Health check: http://${env.HOST}:${env.PORT}/health`);
    app.log.info(`   Meal Analyze: POST http://${env.HOST}:${env.PORT}/api/v1/meals/analyze`);
  } catch (err) {
    app.log.error({ err }, '[Server] Failed to start');
    process.exit(1);
  }
}

start();
