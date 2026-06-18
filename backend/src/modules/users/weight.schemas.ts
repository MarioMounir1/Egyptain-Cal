/**
 * @file modules/users/weight.schemas.ts
 * @description Zod schema for logging weight.
 */

import { z } from 'zod';

export const LogWeightBodySchema = z.object({
  weight_kg: z.number().positive('Weight must be positive'),
});

export type LogWeightBody = z.infer<typeof LogWeightBodySchema>;

export interface WeightLogRecord {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
}
