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
  type FoodRecord,
} from '../foods/index.js';
import { getUserProfile } from '../users/index.js';
import { generateAIMealPlan } from '../../shared/ai/ollamaClient.js';
import type {
  AnalyzeMealBody,
  AnalyzePhotoMealBody,
  AnalyzeMealResponse,
  MealPlanResponse,
  MealPlanItem,
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

function classifyFood(food: FoodRecord): ('breakfast' | 'lunch' | 'dinner' | 'snack')[] {
  const categories: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = [];
  const nameLower = (food.name + ' ' + (food.name_en || '') + ' ' + (food.category || '')).toLowerCase();

  // Breakfast clues
  const isBreakfast =
    nameLower.includes('breakfast') ||
    nameLower.includes('dairy') ||
    nameLower.includes('egg') ||
    nameLower.includes('cheese') ||
    nameLower.includes('ful') ||
    nameLower.includes('foul') ||
    nameLower.includes('falafel') ||
    nameLower.includes('taameya') ||
    nameLower.includes('bread') ||
    nameLower.includes('honey') ||
    nameLower.includes('جبن') ||
    nameLower.includes('بيض') ||
    nameLower.includes('فول') ||
    nameLower.includes('طعمية') ||
    nameLower.includes('عسل') ||
    nameLower.includes('خبز') ||
    nameLower.includes('فطير');

  // Lunch clues
  const isLunch =
    nameLower.includes('lunch') ||
    nameLower.includes('stew') ||
    nameLower.includes('koshary') ||
    nameLower.includes('kebab') ||
    nameLower.includes('kofta') ||
    nameLower.includes('meat') ||
    nameLower.includes('chicken') ||
    nameLower.includes('fish') ||
    nameLower.includes('rice') ||
    nameLower.includes('pasta') ||
    nameLower.includes('mahashi') ||
    nameLower.includes('street food') ||
    nameLower.includes('لحم') ||
    nameLower.includes('دجاج') ||
    nameLower.includes('سمك') ||
    nameLower.includes('أرز') ||
    nameLower.includes('ارز') ||
    nameLower.includes('كشري') ||
    nameLower.includes('مكرونة') ||
    nameLower.includes('محشي') ||
    nameLower.includes('طواجن') ||
    nameLower.includes('طاجن');

  // Snack clues
  const isSnack =
    nameLower.includes('snack') ||
    nameLower.includes('beverage') ||
    nameLower.includes('dessert') ||
    nameLower.includes('fruit') ||
    nameLower.includes('nuts') ||
    nameLower.includes('yogurt') ||
    nameLower.includes('milk') ||
    nameLower.includes('فاكهة') ||
    nameLower.includes('زبادي') ||
    nameLower.includes('عصير') ||
    nameLower.includes('شاي') ||
    nameLower.includes('قهوة') ||
    nameLower.includes('مكسرات') ||
    nameLower.includes('بسكويت') ||
    nameLower.includes('حلوى') ||
    nameLower.includes('شوكولاتة');

  if (isBreakfast) categories.push('breakfast');
  if (isLunch) categories.push('lunch');
  // Dinner can overlap with breakfast or lunch
  if (isBreakfast || isLunch || nameLower.includes('dinner') || nameLower.includes('عشاء')) {
    categories.push('dinner');
  }
  if (isSnack) categories.push('snack');

  // Fallbacks based on calories if nothing matched
  if (categories.length === 0) {
    const avgCal = (food.calories_min + food.calories_max) / 2;
    if (avgCal < 200) {
      categories.push('snack');
    } else if (avgCal < 450) {
      categories.push('breakfast', 'dinner');
    } else {
      categories.push('lunch', 'dinner');
    }
  }

  return categories;
}

export async function generateMealPlan(userId: string): Promise<MealPlanResponse> {
  // 1. Fetch user targets
  const user = await getUserProfile(userId);
  if (!user.daily_calorie_goal) {
    throw new ValidationError('User profile must have targets calculated before generating a meal plan.');
  }

  const targetCal = Number(user.daily_calorie_goal);
  const targetProt = Number(user.target_protein_g || 0);
  const targetCarb = Number(user.target_carbs_g || 0);
  const targetFat = Number(user.target_fat_g || 0);

  // 2. Fetch all foods from DB
  const foods = await query<FoodRecord>('SELECT * FROM foods ORDER BY verified DESC, created_at DESC');

  // 3. Classify into pools
  const breakfastPool: FoodRecord[] = [];
  const lunchPool: FoodRecord[] = [];
  const dinnerPool: FoodRecord[] = [];
  const snackPool: FoodRecord[] = [];

  for (const food of foods) {
    const cats = classifyFood(food);
    if (cats.includes('breakfast')) breakfastPool.push(food);
    if (cats.includes('lunch')) lunchPool.push(food);
    if (cats.includes('dinner')) dinnerPool.push(food);
    if (cats.includes('snack')) snackPool.push(food);
  }

  let chosenCombination: {
    breakfast: FoodRecord;
    lunch: FoodRecord;
    dinner: FoodRecord;
    snack: FoodRecord;
  } | null = null;

  // 4. Try matching from DB if pools are not empty
  if (
    breakfastPool.length > 0 &&
    lunchPool.length > 0 &&
    dinnerPool.length > 0 &&
    snackPool.length > 0
  ) {
    // Limit pool sizes to prevent performance issues (max 20)
    const bSlice = breakfastPool.slice(0, 20);
    const lSlice = lunchPool.slice(0, 20);
    const dSlice = dinnerPool.slice(0, 20);
    const sSlice = snackPool.slice(0, 20);

    let bestScore = Infinity;

    for (const b of bSlice) {
      const bCal = (b.calories_min + b.calories_max) / 2;
      const bProt = (Number(b.protein_min_g) + Number(b.protein_max_g)) / 2;
      const bCarb = (Number(b.carbs_min_g) + Number(b.carbs_max_g)) / 2;
      const bFat = (Number(b.fat_min_g) + Number(b.fat_max_g)) / 2;

      for (const l of lSlice) {
        const lCal = (l.calories_min + l.calories_max) / 2;
        const lProt = (Number(l.protein_min_g) + Number(l.protein_max_g)) / 2;
        const lCarb = (Number(l.carbs_min_g) + Number(l.carbs_max_g)) / 2;
        const lFat = (Number(l.fat_min_g) + Number(l.fat_max_g)) / 2;

        for (const d of dSlice) {
          const dCal = (d.calories_min + d.calories_max) / 2;
          const dProt = (Number(d.protein_min_g) + Number(d.protein_max_g)) / 2;
          const dCarb = (Number(d.carbs_min_g) + Number(d.carbs_max_g)) / 2;
          const dFat = (Number(d.fat_min_g) + Number(d.fat_max_g)) / 2;

          for (const s of sSlice) {
            const sCal = (s.calories_min + s.calories_max) / 2;
            const sProt = (Number(s.protein_min_g) + Number(s.protein_max_g)) / 2;
            const sCarb = (Number(s.carbs_min_g) + Number(s.carbs_max_g)) / 2;
            const sFat = (Number(s.fat_min_g) + Number(s.fat_max_g)) / 2;

            const totalCal = bCal + lCal + dCal + sCal;
            const totalProt = bProt + lProt + dProt + sProt;
            const totalCarb = bCarb + lCarb + dCarb + sCarb;
            const totalFat = bFat + lFat + dFat + sFat;

            // Check if within thresholds (Calories ±10%, macros ±20%)
            const calDiffPct = Math.abs(totalCal - targetCal) / targetCal;
            const protDiffPct = Math.abs(totalProt - targetProt) / (targetProt || 1);
            const carbDiffPct = Math.abs(totalCarb - targetCarb) / (targetCarb || 1);
            const fatDiffPct = Math.abs(totalFat - targetFat) / (targetFat || 1);

            if (calDiffPct <= 0.1 && protDiffPct <= 0.2 && carbDiffPct <= 0.2 && fatDiffPct <= 0.2) {
              // Score combination: lower is better
              const score = 0.5 * calDiffPct + 0.2 * protDiffPct + 0.15 * carbDiffPct + 0.15 * fatDiffPct;
              if (score < bestScore) {
                bestScore = score;
                chosenCombination = { breakfast: b, lunch: l, dinner: d, snack: s };
              }
            }
          }
        }
      }
    }
  }

  if (chosenCombination) {
    // 5a. Found database combination! Format and return it
    const { breakfast, lunch, dinner, snack } = chosenCombination;
    const formatRange = (min: number | string, max: number | string, unit: string) =>
      `${min}${unit} - ${max}${unit}`;

    const items: MealPlanItem[] = [
      {
        mealType: 'breakfast',
        foodId: breakfast.id,
        name: breakfast.name,
        name_en: breakfast.name_en,
        category: breakfast.category,
        serving_desc: breakfast.serving_desc,
        caloriesRange: formatRange(breakfast.calories_min, breakfast.calories_max, ''),
        proteinRange: formatRange(breakfast.protein_min_g, breakfast.protein_max_g, 'g'),
        carbsRange: formatRange(breakfast.carbs_min_g, breakfast.carbs_max_g, 'g'),
        fatRange: formatRange(breakfast.fat_min_g, breakfast.fat_max_g, 'g'),
        alerts: ['Retrieved from verified local food database.'],
      },
      {
        mealType: 'lunch',
        foodId: lunch.id,
        name: lunch.name,
        name_en: lunch.name_en,
        category: lunch.category,
        serving_desc: lunch.serving_desc,
        caloriesRange: formatRange(lunch.calories_min, lunch.calories_max, ''),
        proteinRange: formatRange(lunch.protein_min_g, lunch.protein_max_g, 'g'),
        carbsRange: formatRange(lunch.carbs_min_g, lunch.carbs_max_g, 'g'),
        fatRange: formatRange(lunch.fat_min_g, lunch.fat_max_g, 'g'),
        alerts: ['Retrieved from verified local food database.'],
      },
      {
        mealType: 'dinner',
        foodId: dinner.id,
        name: dinner.name,
        name_en: dinner.name_en,
        category: dinner.category,
        serving_desc: dinner.serving_desc,
        caloriesRange: formatRange(dinner.calories_min, dinner.calories_max, ''),
        proteinRange: formatRange(dinner.protein_min_g, dinner.protein_max_g, 'g'),
        carbsRange: formatRange(dinner.carbs_min_g, dinner.carbs_max_g, 'g'),
        fatRange: formatRange(dinner.fat_min_g, dinner.fat_max_g, 'g'),
        alerts: ['Retrieved from verified local food database.'],
      },
      {
        mealType: 'snack',
        foodId: snack.id,
        name: snack.name,
        name_en: snack.name_en,
        category: snack.category,
        serving_desc: snack.serving_desc,
        caloriesRange: formatRange(snack.calories_min, snack.calories_max, ''),
        proteinRange: formatRange(snack.protein_min_g, snack.protein_max_g, 'g'),
        carbsRange: formatRange(snack.carbs_min_g, snack.carbs_max_g, 'g'),
        fatRange: formatRange(snack.fat_min_g, snack.fat_max_g, 'g'),
        alerts: ['Retrieved from verified local food database.'],
      },
    ];

    const actualCal = Math.round(
      items.reduce((sum, item) => {
        const parts = item.caloriesRange.split(' - ');
        return sum + (Number(parts[0]) + Number(parts[1])) / 2;
      }, 0)
    );
    const actualProt = Number(
      items.reduce((sum, item) => {
        const parts = item.proteinRange.replace(/g/g, '').split(' - ');
        return sum + (Number(parts[0]) + Number(parts[1])) / 2;
      }, 0).toFixed(1)
    );
    const actualCarb = Number(
      items.reduce((sum, item) => {
        const parts = item.carbsRange.replace(/g/g, '').split(' - ');
        return sum + (Number(parts[0]) + Number(parts[1])) / 2;
      }, 0).toFixed(1)
    );
    const actualFat = Number(
      items.reduce((sum, item) => {
        const parts = item.fatRange.replace(/g/g, '').split(' - ');
        return sum + (Number(parts[0]) + Number(parts[1])) / 2;
      }, 0).toFixed(1)
    );

    return {
      status: 'success',
      source: 'db_lookup',
      data: items,
      totals: {
        calories: { target: targetCal, actual: actualCal },
        protein: { target: targetProt, actual: actualProt },
        carbs: { target: targetCarb, actual: actualCarb },
        fat: { target: targetFat, actual: actualFat },
      },
    };
  }

  // 5b. Falls back to AI!
  const aiMeals = await generateAIMealPlan(targetCal, targetProt, targetCarb, targetFat);

  const formattedItems: MealPlanItem[] = [];

  for (const aiMeal of aiMeals) {
    let foodRecord: FoodRecord | null = null;
    const existing = await findByName(aiMeal.name);

    if (existing) {
      foodRecord = existing;
    } else {
      // Save/catalog newly generated food to DB so it is cached!
      try {
        foodRecord = await createFood({
          name: aiMeal.name,
          name_en: aiMeal.name_en,
          barcode: null,
          category: aiMeal.category,
          serving_desc: aiMeal.serving_desc,
          calories: aiMeal.calories,
          protein: aiMeal.protein,
          carbs: aiMeal.carbs,
          fat: aiMeal.fat,
          source: 'ai',
        });
      } catch (err) {
        // Handle race condition or duplicate name check
        foodRecord = await findByName(aiMeal.name);
      }
    }

    const formatRange = (min: number | string, max: number | string, unit: string) =>
      `${min}${unit} - ${max}${unit}`;

    if (foodRecord) {
      formattedItems.push({
        mealType: aiMeal.meal_type,
        foodId: foodRecord.id,
        name: foodRecord.name,
        name_en: foodRecord.name_en,
        category: foodRecord.category,
        serving_desc: foodRecord.serving_desc,
        caloriesRange: formatRange(foodRecord.calories_min, foodRecord.calories_max, ''),
        proteinRange: formatRange(foodRecord.protein_min_g, foodRecord.protein_max_g, 'g'),
        carbsRange: formatRange(foodRecord.carbs_min_g, foodRecord.carbs_max_g, 'g'),
        fatRange: formatRange(foodRecord.fat_min_g, foodRecord.fat_max_g, 'g'),
        alerts: aiMeal.alerts,
      });
    } else {
      // Direct formatting of the AI values if DB save failed completely
      const calRange = computeIntRange(aiMeal.calories);
      const protRange = computeDecimalRange(aiMeal.protein);
      const carbRange = computeDecimalRange(aiMeal.carbs);
      const fatRange = computeDecimalRange(aiMeal.fat);

      formattedItems.push({
        mealType: aiMeal.meal_type,
        foodId: null,
        name: aiMeal.name,
        name_en: aiMeal.name_en,
        category: aiMeal.category,
        serving_desc: aiMeal.serving_desc,
        caloriesRange: formatRange(calRange.min, calRange.max, ''),
        proteinRange: formatRange(protRange.min, protRange.max, 'g'),
        carbsRange: formatRange(carbRange.min, carbRange.max, 'g'),
        fatRange: formatRange(fatRange.min, fatRange.max, 'g'),
        alerts: aiMeal.alerts,
      });
    }
  }

  const actualCal = Math.round(
    formattedItems.reduce((sum, item) => {
      const parts = item.caloriesRange.split(' - ');
      return sum + (Number(parts[0]) + Number(parts[1])) / 2;
    }, 0)
  );
  const actualProt = Number(
    formattedItems.reduce((sum, item) => {
      const parts = item.proteinRange.replace(/g/g, '').split(' - ');
      return sum + (Number(parts[0]) + Number(parts[1])) / 2;
    }, 0).toFixed(1)
  );
  const actualCarb = Number(
    formattedItems.reduce((sum, item) => {
      const parts = item.carbsRange.replace(/g/g, '').split(' - ');
      return sum + (Number(parts[0]) + Number(parts[1])) / 2;
    }, 0).toFixed(1)
  );
  const actualFat = Number(
    formattedItems.reduce((sum, item) => {
      const parts = item.fatRange.replace(/g/g, '').split(' - ');
      return sum + (Number(parts[0]) + Number(parts[1])) / 2;
    }, 0).toFixed(1)
  );

  return {
    status: 'success',
    source: 'ai_generation',
    data: formattedItems,
    totals: {
      calories: { target: targetCal, actual: actualCal },
      protein: { target: targetProt, actual: actualProt },
      carbs: { target: targetCarb, actual: actualCarb },
      fat: { target: targetFat, actual: actualFat },
    },
  };
}

export interface MealLogRecord {
  id: string;
  raw_text: string;
  calorie_min: number;
  calorie_max: number;
  protein_min_g: number;
  protein_max_g: number;
  carbs_min_g: number;
  carbs_max_g: number;
  fat_min_g: number;
  fat_max_g: number;
  alerts: string[];
  food_id: string | null;
  source: string;
  logged_at: string;
}

/**
 * Retrieves meal logs for a specific user on a specific date in a specific timezone.
 */
export async function getMealsByDate(
  userId: string,
  dateStr: string,
  timezone: string = 'Africa/Cairo'
): Promise<MealLogRecord[]> {
  const SQL = `
    SELECT
      id,
      raw_text,
      calorie_min,
      calorie_max,
      protein_min_g,
      protein_max_g,
      carbs_min_g,
      carbs_max_g,
      fat_min_g,
      fat_max_g,
      alerts,
      food_id,
      source,
      logged_at
    FROM daily_calorie_logs
    WHERE user_id = $1
      AND (logged_at AT TIME ZONE $2)::date = $3::date
    ORDER BY logged_at DESC
  `;

  return await query<MealLogRecord>(SQL, [userId, timezone, dateStr]);
}

/**
 * Deletes a specific meal log owned by the user.
 */
export async function deleteMealLog(userId: string, logId: string): Promise<void> {
  const SQL = `
    DELETE FROM daily_calorie_logs
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const rows = await query<{ id: string }>(SQL, [logId, userId]);
  if (rows.length === 0) {
    throw new ValidationError('Meal log not found or does not belong to user');
  }
}

