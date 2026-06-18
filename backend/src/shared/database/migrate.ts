/**
 * @file shared/database/migrate.ts
 * @description Database migration script — run once to create schema.
 * Usage: npm run db:migrate
 *
 * Index strategy:
 *  - users.email            → UNIQUE (login lookups)
 *  - daily_calorie_logs.user_id + logged_at → composite (time-series queries)
 *  - sponsors.is_active     → partial index (active sponsors filter)
 */

import 'dotenv/config';
import { pool } from './pool.js';

const SQL_SCHEMA = /* sql */ `
-- ───────────────────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ───────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ───────────────────────────────────────────────────────────────────────────
-- TABLE: users
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  daily_calorie_goal INTEGER,
  weight_kg       NUMERIC(5,2),
  height_cm       NUMERIC(5,2),
  age             INTEGER,
  gender          VARCHAR(10), -- 'male' | 'female' | 'other'
  activity_level  VARCHAR(30), -- 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active'
  goal            VARCHAR(30), -- 'lose_weight' | 'maintain_weight' | 'gain_weight'
  target_protein_g NUMERIC(6,2),
  target_carbs_g   NUMERIC(6,2),
  target_fat_g     NUMERIC(6,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
  ON users (email);

-- ───────────────────────────────────────────────────────────────────────────
-- TABLE: daily_calorie_logs
-- Stores real-time macro snapshots computed by the AI engine.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_calorie_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  raw_text        TEXT NOT NULL,
  calorie_min     INTEGER NOT NULL,
  calorie_max     INTEGER NOT NULL,
  protein_min_g   NUMERIC(6,2) NOT NULL,
  protein_max_g   NUMERIC(6,2) NOT NULL,
  carbs_min_g     NUMERIC(6,2) NOT NULL,
  carbs_max_g     NUMERIC(6,2) NOT NULL,
  fat_min_g       NUMERIC(6,2) NOT NULL,
  fat_max_g       NUMERIC(6,2) NOT NULL,
  alerts          TEXT[] DEFAULT '{}',
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index: all daily log queries filter by user + time window
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_time
  ON daily_calorie_logs (user_id, logged_at DESC);

-- ───────────────────────────────────────────────────────────────────────────
-- TABLE: sponsors
-- Protein bars, supplements, etc.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sponsors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_name      VARCHAR(150) NOT NULL,
  product_name    VARCHAR(200) NOT NULL,
  category        VARCHAR(100) NOT NULL,
  description     TEXT,
  cta_url         VARCHAR(500),
  image_url       VARCHAR(500),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  priority        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial index: only index active sponsors (the common query)
CREATE INDEX IF NOT EXISTS idx_sponsors_active
  ON sponsors (priority DESC)
  WHERE is_active = TRUE;

-- ───────────────────────────────────────────────────────────────────────────
-- TABLE: foods
-- Growing knowledge base of Egyptian food items.
-- Self-populates via manual entry, photo scan, screenshot, and AI analysis.
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  name            TEXT        NOT NULL,          -- Primary name (Arabic preferred)
  name_en         TEXT,                          -- English alias / translation
  category        VARCHAR(100),                  -- e.g. 'Egyptian street food', 'dairy', 'grains'
  serving_desc    TEXT,                          -- e.g. '1 plate (~400g)'
  barcode         VARCHAR(50),                   -- barcode scan for packaged foods

  -- Source tracking
  source          VARCHAR(20) NOT NULL DEFAULT 'ai',
                  -- 'ai' | 'photo' | 'screenshot' | 'manual'
  verified        BOOLEAN     NOT NULL DEFAULT FALSE, -- manually reviewed & approved

  -- Macro ranges (5% margin applied to midpoint estimates)
  calories_min    INTEGER     NOT NULL,
  calories_max    INTEGER     NOT NULL,
  protein_min_g   NUMERIC(6,2) NOT NULL,
  protein_max_g   NUMERIC(6,2) NOT NULL,
  carbs_min_g     NUMERIC(6,2) NOT NULL,
  carbs_max_g     NUMERIC(6,2) NOT NULL,
  fat_min_g       NUMERIC(6,2) NOT NULL,
  fat_max_g       NUMERIC(6,2) NOT NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search across Arabic + English names
CREATE INDEX IF NOT EXISTS idx_foods_name_fts
  ON foods USING gin(to_tsvector('simple', name || ' ' || COALESCE(name_en, '')));

-- Unique name constraint (case-insensitive) — prevents duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_foods_name_unique
  ON foods (lower(name));

-- Unique barcode index (only if barcode is set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_foods_barcode
  ON foods (barcode)
  WHERE barcode IS NOT NULL;

-- ───────────────────────────────────────────────────────────────────────────
-- ALTER: daily_calorie_logs
-- Add food_id FK so each log entry can reference a known food item,
-- and a source column to track how the macro data was obtained.
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE daily_calorie_logs
  ADD COLUMN IF NOT EXISTS food_id UUID REFERENCES foods(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source  VARCHAR(20) NOT NULL DEFAULT 'ai';
  -- source values: 'db_lookup' | 'ai_text' | 'ai_photo' | 'ai_screenshot' | 'manual'

-- ───────────────────────────────────────────────────────────────────────────
-- ALTER: users
-- Add profile metadata and target macros columns
-- ───────────────────────────────────────────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS weight_kg       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS height_cm       NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS age             INTEGER,
  ADD COLUMN IF NOT EXISTS gender          VARCHAR(10),
  ADD COLUMN IF NOT EXISTS activity_level  VARCHAR(30),
  ADD COLUMN IF NOT EXISTS goal            VARCHAR(30),
  ADD COLUMN IF NOT EXISTS target_protein_g NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS target_carbs_g   NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS target_fat_g     NUMERIC(6,2);
`;

async function migrate(): Promise<void> {
  console.log('⚙️  [Migration] Running schema migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(SQL_SCHEMA);
    await client.query('COMMIT');
    console.log('✅ [Migration] Schema is up to date.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [Migration] Failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error('❌ [Migration] Uncaught error:', err);
  process.exit(1);
});
