/**
 * @file modules/users/water.schemas.ts
 * @description Zod schema and types for logging water intake.
 */

import { z } from 'zod';

export const LogWaterBodySchema = z.object({
  amount_ml: z.number().int().positive('Water amount must be a positive integer'),
});

export type LogWaterBody = z.infer<typeof LogWaterBodySchema>;

export interface WaterLogRecord {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
}

export const GetWaterQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  timezone: z.string().default('Africa/Cairo'),
});

export type GetWaterQuery = z.infer<typeof GetWaterQuerySchema>;
