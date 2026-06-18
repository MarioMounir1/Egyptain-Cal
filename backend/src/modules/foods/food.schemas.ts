/**
 * @file modules/foods/food.schemas.ts
 * @description Zod schemas for runtime request/response validation in the Foods module.
 */

import { z } from 'zod';

export const CreateFoodBodySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  name_en: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  serving_desc: z.string().optional().nullable(),
  calories: z.number().int().nonnegative('Calories must be non-negative'),
  protein: z.number().nonnegative('Protein must be non-negative'),
  carbs: z.number().nonnegative('Carbohydrates must be non-negative'),
  fat: z.number().nonnegative('Fat must be non-negative'),
  source: z.enum(['manual', 'photo', 'screenshot', 'ai']).default('manual'),
});

export type CreateFoodBody = z.infer<typeof CreateFoodBodySchema>;

export const SearchFoodQuerySchema = z.object({
  q: z.string().min(1, 'Search query must be at least 1 character').trim(),
});

export type SearchFoodQuery = z.infer<typeof SearchFoodQuerySchema>;

export interface FoodRecord {
  id: string;
  name: string;
  name_en: string | null;
  barcode: string | null;
  category: string | null;
  serving_desc: string | null;
  source: 'manual' | 'photo' | 'screenshot' | 'ai';
  verified: boolean;
  calories_min: number;
  calories_max: number;
  protein_min_g: number;
  protein_max_g: number;
  carbs_min_g: number;
  carbs_max_g: number;
  fat_min_g: number;
  fat_max_g: number;
  created_at: string;
  updated_at: string;
}
