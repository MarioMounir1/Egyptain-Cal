/**
 * @file modules/meals/meal.service.ts
 * @description Core business logic for meal macro analysis.
 */

import { query } from '../../shared/database/pool.js';
import { AIEngineError, ValidationError } from '../../shared/errors/AppError.js';
import { env } from '../../config/env.js';
import { analyzeTextMeal } from '../../shared/ai/ollamaClient.js';
import { analyzeVisionMeal } from '../../shared/ai/ollamaVisionClient.js';
import {
  findByName,
  createFood,
  computeIntRange,
  computeDecimalRange,
} from '../foods/index.js';
import type {
  AnalyzeMealBody,
  AnalyzePhotoMealBody,
  AnalyzeMealResponse,
} from './meal.schemas.js';

// ── Persistence ─────────────────────────────────────────────────────────────

async function persistMealLog(
  userId: string,
  rawText: string,
  caloriesMin: number,
  caloriesMax: number,
  proteinMin: number,
  proteinMax: number,
  carbsMin: number,
  carbsMax: number,
  fatMin: number,
  fatMax: number,
  alerts: string[],
  foodId: string | null,
  source: string,
): Promise<string> {
  const SQL = /* sql */ `
    INSERT INTO daily_calorie_logs
      (user_id, raw_text,
       calorie_min, calorie_max,
       protein_min_g, protein_max_g,
       carbs_min_g, carbs_max_g,
       fat_min_g, fat_max_g,
       alerts, food_id, source)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING id
  `;

  const rows = await query<{ id: string }>(SQL, [
    userId,
    rawText,
    caloriesMin,
    caloriesMax,
    proteinMin,
    proteinMax,
    carbsMin,
    carbsMax,
    fatMin,
    fatMax,
    alerts,
    foodId,
    source,
  ]);

  if (!rows[0]) throw new AIEngineError('Failed to persist meal log.');
  return rows[0].id;
}

// ── Public Service API ──────────────────────────────────────────────────────

/**
 * Main text-based meal analysis flow.
 * Checks DB first. If found, returns macros instantly.
 * If not found, calls llama3 (if AI_ENABLED) and catalogs the result.
 */
export async function analyzeMeal(body: AnalyzeMealBody): Promise<AnalyzeMealResponse> {
  const normalizedText = body.rawText.trim();

  // 1. Try to find the food in the database by case-insensitive name
  const existingFood = await findByName(normalizedText);

  let foodId: string | null = null;
  let calMin: number;
  let calMax: number;
  let protMin: number;
  let protMax: number;
  let carbMin: number;
  let carbMax: number;
  let fatMin: number;
  let fatMax: number;
  let alerts: string[];
  let logSource: string;

  if (existingFood) {
    // DB hit! Use existing macros. No AI call.
    foodId = existingFood.id;
    calMin = existingFood.calories_min;
    calMax = existingFood.calories_max;
    protMin = Number(existingFood.protein_min_g);
    protMax = Number(existingFood.protein_max_g);
    carbMin = Number(existingFood.carbs_min_g);
    carbMax = Number(existingFood.carbs_max_g);
    fatMin = Number(existingFood.fat_min_g);
    fatMax = Number(existingFood.fat_max_g);
    alerts = [
      '✅ Retrieved from verified local food database.',
      ...(existingFood.serving_desc ? [`Serving size: ${existingFood.serving_desc}`] : []),
    ];
    logSource = 'db_lookup';
  } else {
    // DB miss! Call AI if enabled.
    if (!env.AI_ENABLED) {
      throw new ValidationError('Food not found in database and AI analysis is disabled.');
    }

    // Call llama3 client
    const aiResult = await analyzeTextMeal(normalizedText);

    // Compute range margins (5%)
    const calRange = computeIntRange(aiResult.calories);
    const protRange = computeDecimalRange(aiResult.protein);
    const carbRange = computeDecimalRange(aiResult.carbs);
    const fatRange = computeDecimalRange(aiResult.fat);

    calMin = calRange.min;
    calMax = calRange.max;
    protMin = protRange.min;
    protMax = protRange.max;
    carbMin = carbRange.min;
    carbMax = carbRange.max;
    fatMin = fatRange.min;
    fatMax = fatRange.max;
    alerts = aiResult.alerts;
    logSource = 'ai_text';

    // Save newly analyzed food item to DB so future lookups find it!
    try {
      const newFood = await createFood({
        name: aiResult.name || normalizedText,
        name_en: aiResult.name_en,
        barcode: null,
        category: aiResult.category,
        serving_desc: aiResult.serving_desc,
        calories: aiResult.calories,
        protein: aiResult.protein,
        carbs: aiResult.carbs,
        fat: aiResult.fat,
        source: 'ai',
      });
      foodId = newFood.id;
    } catch (err) {
      // If a parallel process inserted it first or name check failed, swallow and try to look it up
      const fallbackLookup = await findByName(aiResult.name || normalizedText);
      if (fallbackLookup) {
        foodId = fallbackLookup.id;
      }
    }
  }

  // Persist log to daily_calorie_logs
  const logId = await persistMealLog(
    body.userId,
    body.rawText,
    calMin,
    calMax,
    protMin,
    protMax,
    carbMin,
    carbMax,
    fatMin,
    fatMax,
    alerts,
    foodId,
    logSource,
  );

  const fmt = (min: number, max: number, unit: string) =>
    `${min}${unit === 'kcal' ? '' : unit} - ${max}${unit === 'kcal' ? '' : unit}`;

  return {
    status: 'success',
    data: {
      calorieRange: `${calMin} - ${calMax}`,
      proteinRange: fmt(protMin, protMax, 'g'),
      carbsRange:   fmt(carbMin, carbMax, 'g'),
      fatRange:     fmt(fatMin, fatMax, 'g'),
      alerts,
    },
    meta: {
      userId: body.userId,
      analyzedAt: new Date().toISOString(),
      logId,
    },
  };
}

/**
 * Image-based (photo/screenshot) meal analysis flow using vision model.
 * Calls llava, computes 5% margin ranges, and catalogs new items in foods.
 */
export async function analyzePhotoMeal(body: AnalyzePhotoMealBody): Promise<AnalyzeMealResponse> {
  const { image, userId, mode } = body;

  if (!env.AI_ENABLED) {
    throw new ValidationError('AI vision analysis is disabled.');
  }

  // 1. Call vision AI client (llava)
  const aiResult = await analyzeVisionMeal(image, mode);

  // 2. Compute range margins (5%)
  const calRange = computeIntRange(aiResult.calories);
  const protRange = computeDecimalRange(aiResult.protein);
  const carbRange = computeDecimalRange(aiResult.carbs);
  const fatRange = computeDecimalRange(aiResult.fat);

  const calMin = calRange.min;
  const calMax = calRange.max;
  const protMin = protRange.min;
  const protMax = protRange.max;
  const carbMin = carbRange.min;
  const carbMax = carbRange.max;
  const fatMin = fatRange.min;
  const fatMax = fatRange.max;

  const normalizedName = aiResult.name.trim();

  // 3. Search foods table to see if it's already in the database
  let foodId: string | null = null;
  const existingFood = await findByName(normalizedName);

  if (existingFood) {
    foodId = existingFood.id;
  } else {
    // Save to database so we catalog it!
    try {
      const newFood = await createFood({
        name: normalizedName,
        name_en: aiResult.name_en,
        barcode: null,
        category: aiResult.category,
        serving_desc: aiResult.serving_desc,
        calories: aiResult.calories,
        protein: aiResult.protein,
        carbs: aiResult.carbs,
        fat: aiResult.fat,
        source: mode, // 'photo' or 'screenshot'
      });
      foodId = newFood.id;
    } catch (err) {
      // Name collision check
      const fallbackLookup = await findByName(normalizedName);
      if (fallbackLookup) {
        foodId = fallbackLookup.id;
      }
    }
  }

  // 4. Persist to daily_calorie_logs
  const logSource = mode === 'photo' ? 'ai_photo' : 'ai_screenshot';
  const logId = await persistMealLog(
    userId,
    `[Image Upload: ${normalizedName}]`,
    calMin,
    calMax,
    protMin,
    protMax,
    carbMin,
    carbMax,
    fatMin,
    fatMax,
    aiResult.alerts,
    foodId,
    logSource,
  );

  const fmt = (min: number, max: number, unit: string) =>
    `${min}${unit === 'kcal' ? '' : unit} - ${max}${unit === 'kcal' ? '' : unit}`;

  return {
    status: 'success',
    data: {
      calorieRange: `${calMin} - ${calMax}`,
      proteinRange: fmt(protMin, protMax, 'g'),
      carbsRange:   fmt(carbMin, carbMax, 'g'),
      fatRange:     fmt(fatMin, fatMax, 'g'),
      alerts:       aiResult.alerts,
    },
    meta: {
      userId,
      analyzedAt: new Date().toISOString(),
      logId,
    },
  };
}
