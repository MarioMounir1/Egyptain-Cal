/**
 * @file modules/auth/auth.schemas.ts
 * @description Zod validation schemas and type definitions for Authentication.
 */

import { z } from 'zod';

export const SignupBodySchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  display_name: z.string().min(1, 'Display name is required'),
});

export type SignupBody = z.infer<typeof SignupBodySchema>;

export const LoginBodySchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginBody = z.infer<typeof LoginBodySchema>;
