/**
 * @file config/env.ts
 * @description Centralized, validated environment configuration.
 * All env vars are parsed and typed here — never read process.env directly elsewhere.
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  HOST: z.string().default('0.0.0.0'),

  // PostgreSQL
  POSTGRES_HOST: z.string().min(1),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_DB: z.string().min(1),
  POSTGRES_USER: z.string().min(1),
  POSTGRES_PASSWORD: z.string().min(1),
  POSTGRES_POOL_MIN: z.coerce.number().int().nonnegative().default(2),
  POSTGRES_POOL_MAX: z.coerce.number().int().positive().default(10),

  // AI Engine
  AI_ENGINE_URL: z.string().url().optional(),
  AI_MODEL: z.string().default('llama3'),
  AI_VISION_MODEL: z.string().default('llava'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  AI_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),

  // Rate Limiting
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  // JWT Auth
  JWT_SECRET: z.string().min(8),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ [Config] Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
