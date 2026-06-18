/**
 * @file modules/users/user.schemas.ts
 * @description Zod validation schemas and type contracts for the Users module.
 */

import { z } from 'zod';

export const UpdateProfileBodySchema = z.object({
  display_name: z.string().min(1).optional(),
  weight_kg: z.number().positive('Weight must be positive').optional().nullable(),
  height_cm: z.number().positive('Height must be positive').optional().nullable(),
  age: z.number().int().positive('Age must be a positive integer').optional().nullable(),
  gender: z.enum(['male', 'female', 'other']).optional().nullable(),
  activity_level: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extra_active'
  ]).optional().nullable(),
  goal: z.enum(['lose_weight', 'maintain_weight', 'gain_weight']).optional().nullable(),
  daily_calorie_goal: z.number().int().positive().optional().nullable(),
  target_protein_g: z.number().positive().optional().nullable(),
  target_carbs_g: z.number().positive().optional().nullable(),
  target_fat_g: z.number().positive().optional().nullable(),
});

export type UpdateProfileBody = z.infer<typeof UpdateProfileBodySchema>;

export const CalculateTargetsBodySchema = z.object({
  weight_kg: z.number().positive('Weight must be positive'),
  height_cm: z.number().positive('Height must be positive'),
  age: z.number().int().positive('Age must be a positive integer'),
  gender: z.enum(['male', 'female', 'other']),
  activity_level: z.enum([
    'sedentary',
    'lightly_active',
    'moderately_active',
    'very_active',
    'extra_active'
  ]),
  goal: z.enum(['lose_weight', 'maintain_weight', 'gain_weight']),
});

export type CalculateTargetsBody = z.infer<typeof CalculateTargetsBodySchema>;

export interface UserProfileRecord {
  id: string;
  email: string;
  display_name: string;
  daily_calorie_goal: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  activity_level:
    | 'sedentary'
    | 'lightly_active'
    | 'moderately_active'
    | 'very_active'
    | 'extra_active'
    | null;
  goal: 'lose_weight' | 'maintain_weight' | 'gain_weight' | null;
  target_protein_g: number | null;
  target_carbs_g: number | null;
  target_fat_g: number | null;
  created_at: string;
  updated_at: string;
}
