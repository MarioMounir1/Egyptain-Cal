/**
 * @file modules/meals/meal.schemas.ts
 * @description Zod schemas for runtime request/response validation in the Meals module.
 */

import { z } from 'zod';

// ── Request ────────────────────────────────────────────────────────────────

export const AnalyzeMealBodySchema = z.object({
  rawText: z
    .string()
    .min(3, 'rawText must be at least 3 characters')
    .max(500, 'rawText must not exceed 500 characters')
    .trim(),
  userId: z
    .string()
    .uuid('userId must be a valid UUID'),
});

export type AnalyzeMealBody = z.infer<typeof AnalyzeMealBodySchema>;

export const AnalyzePhotoMealBodySchema = z.object({
  image: z.string().min(1, 'Image must be a base64 encoded string'),
  userId: z.string().uuid('userId must be a valid UUID'),
  mode: z.enum(['photo', 'screenshot']).default('photo'),
});

export type AnalyzePhotoMealBody = z.infer<typeof AnalyzePhotoMealBodySchema>;

export const MealPlanQuerySchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
});

export type MealPlanQuery = z.infer<typeof MealPlanQuerySchema>;

export const GetMealsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  timezone: z.string().default('Africa/Cairo'),
});

export type GetMealsQuery = z.infer<typeof GetMealsQuerySchema>;

// ── AI Engine Internal Response Types ─────────────────────────────────────

export interface MacroRange {
  min: number;
  max: number;
  unit: string;
}

export interface RawAIParserOutput {
  calories: MacroRange;
  protein: MacroRange;
  carbs: MacroRange;
  fat: MacroRange;
  alerts: string[];
}

// ── API Response ───────────────────────────────────────────────────────────

export interface MealMacroData {
  calorieRange: string;
  proteinRange: string;
  carbsRange: string;
  fatRange: string;
  alerts: string[];
}

export interface AnalyzeMealResponse {
  status: 'success';
  data: MealMacroData;
  meta: {
    userId: string;
    analyzedAt: string;
    logId: string;
  };
}

export interface MealPlanItem {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodId: string | null;
  name: string;
  name_en: string | null;
  category: string | null;
  serving_desc: string | null;
  caloriesRange: string;
  proteinRange: string;
  carbsRange: string;
  fatRange: string;
  alerts: string[];
}

export interface MealPlanResponse {
  status: 'success';
  source: 'db_lookup' | 'ai_generation';
  data: MealPlanItem[];
  totals: {
    calories: { target: number; actual: number };
    protein: { target: number; actual: number };
    carbs: { target: number; actual: number };
    fat: { target: number; actual: number };
  };
}
