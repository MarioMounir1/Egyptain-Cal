/**
 * @file modules/foods/food.service.ts
 * @description Service containing the business logic and database queries for the Foods module.
 */

import { query } from '../../shared/database/pool.js';
import { ValidationError } from '../../shared/errors/AppError.js';
import type { CreateFoodBody, FoodRecord } from './food.schemas.js';

/**
 * Calculates 5% margin ranges for integer values (e.g., calories)
 */
export function computeIntRange(midpoint: number) {
  return {
    min: Math.max(0, Math.floor(midpoint * 0.95)),
    max: Math.ceil(midpoint * 1.05),
  };
}

/**
 * Calculates 5% margin ranges for decimal values (e.g., proteins, carbs, fats)
 */
export function computeDecimalRange(midpoint: number) {
  return {
    min: Math.max(0, Number((midpoint * 0.95).toFixed(2))),
    max: Number((midpoint * 1.05).toFixed(2)),
  };
}

/**
 * Finds a food record by exact case-insensitive primary name.
 */
export async function findByName(name: string): Promise<FoodRecord | null> {
  const SQL = `SELECT * FROM foods WHERE lower(name) = lower($1) LIMIT 1`;
  const rows = await query<FoodRecord>(SQL, [name]);
  return rows[0] || null;
}

/**
 * Finds a food record by barcode.
 */
export async function findByBarcode(barcode: string): Promise<FoodRecord | null> {
  const SQL = `SELECT * FROM foods WHERE barcode = $1 LIMIT 1`;
  const rows = await query<FoodRecord>(SQL, [barcode]);
  return rows[0] || null;
}

/**
 * Finds a food record by ID.
 */
export async function findById(id: string): Promise<FoodRecord | null> {
  const SQL = `SELECT * FROM foods WHERE id = $1 LIMIT 1`;
  const rows = await query<FoodRecord>(SQL, [id]);
  return rows[0] || null;
}

/**
 * Fuzzy searches food records by name or English name.
 */
export async function searchFoods(q: string): Promise<FoodRecord[]> {
  const SQL = `
    SELECT * FROM foods
    WHERE name ILIKE $1
       OR name_en ILIKE $1
    ORDER BY verified DESC, name ASC
    LIMIT 50
  `;
  return query<FoodRecord>(SQL, [`%${q}%`]);
}

/**
 * Creates a new food record with 5% macro margin ranges.
 */
export async function createFood(body: CreateFoodBody): Promise<FoodRecord> {
  // Check for duplicate name
  const existing = await findByName(body.name);
  if (existing) {
    throw new ValidationError(`Food item "${body.name}" already exists in the database.`);
  }

  // Check for duplicate barcode if provided
  if (body.barcode) {
    const existingBarcode = await findByBarcode(body.barcode);
    if (existingBarcode) {
      throw new ValidationError(`Food item with barcode "${body.barcode}" already exists.`);
    }
  }

  // Calculate macro ranges (5% margin)
  const calRange = computeIntRange(body.calories);
  const protRange = computeDecimalRange(body.protein);
  const carbRange = computeDecimalRange(body.carbs);
  const fatRange = computeDecimalRange(body.fat);

  const SQL = `
    INSERT INTO foods (
      name, name_en, barcode, category, serving_desc, source,
      calories_min, calories_max,
      protein_min_g, protein_max_g,
      carbs_min_g, carbs_max_g,
      fat_min_g, fat_max_g
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `;

  const rows = await query<FoodRecord>(SQL, [
    body.name,
    body.name_en || null,
    body.barcode || null,
    body.category || null,
    body.serving_desc || null,
    body.source,
    calRange.min,
    calRange.max,
    protRange.min,
    protRange.max,
    carbRange.min,
    carbRange.max,
    fatRange.min,
    fatRange.max,
  ]);

  if (!rows[0]) {
    throw new Error('Failed to create food item.');
  }

  return rows[0];
}
