/**
 * @file shared/database/pool.ts
 * @description PostgreSQL connection pool using pg.Pool.
 * Uses indexed, optimized table design; pool settings driven by env config.
 */

import pg from 'pg';
import { env } from '../../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  database: env.POSTGRES_DB,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  min: env.POSTGRES_POOL_MIN,
  max: env.POSTGRES_POOL_MAX,
  // Abort queries that take longer than 30 seconds
  statement_timeout: 30_000,
  // Idle connections are released after 10 seconds
  idleTimeoutMillis: 10_000,
  // Fail fast if connection cannot be established within 5 seconds
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[Database] Unexpected pool error:', err.message);
  process.exit(1);
});

/**
 * Runs a single query and returns rows typed as T[].
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await pool.query<T>(text, params as pg.QueryResultRow[]);
  return result.rows;
}

/**
 * Acquires a dedicated client for transactions.
 * Always call client.release() in a finally block.
 */
export async function getClient(): Promise<pg.PoolClient> {
  return pool.connect();
}

export default pool;
