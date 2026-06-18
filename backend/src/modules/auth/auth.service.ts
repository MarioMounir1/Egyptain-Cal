/**
 * @file modules/auth/auth.service.ts
 * @description Authentication service layer.
 */

import bcrypt from 'bcrypt';
import { query } from '../../shared/database/pool.js';
import { ValidationError, UnauthorizedError } from '../../shared/errors/AppError.js';
import type { UserProfileRecord } from '../users/user.schemas.js';

/**
 * Registers a new user.
 */
export async function signupUser(
  email: string,
  password: string,
  displayName: string
): Promise<UserProfileRecord> {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists
  const existingUsers = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existingUsers.length > 0) {
    throw new ValidationError('Email is already registered');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Insert user
  const SQL = `
    INSERT INTO users (email, display_name, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, email, display_name, daily_calorie_goal, weight_kg, height_cm, age, gender, activity_level, goal, target_protein_g, target_carbs_g, target_fat_g, created_at, updated_at
  `;

  const rows = await query<UserProfileRecord>(SQL, [normalizedEmail, displayName, passwordHash]);
  return rows[0];
}

/**
 * Validates login credentials and returns the user record if valid.
 */
export async function loginUser(
  email: string,
  password: string
): Promise<UserProfileRecord> {
  const normalizedEmail = email.toLowerCase().trim();

  // Find user by email
  const SQL = `
    SELECT id, email, display_name, password_hash, daily_calorie_goal, weight_kg, height_cm, age, gender, activity_level, goal, target_protein_g, target_carbs_g, target_fat_g, created_at, updated_at
    FROM users
    WHERE email = $1
  `;
  const rows = await query<UserProfileRecord & { password_hash: string }>(SQL, [normalizedEmail]);
  const user = rows[0];

  if (!user || !user.password_hash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Verify password
  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Remove password_hash from returning object
  const { password_hash, ...userProfile } = user;
  return userProfile;
}
