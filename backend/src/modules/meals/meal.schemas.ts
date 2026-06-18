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
