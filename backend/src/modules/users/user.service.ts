/**
 * @file modules/users/user.service.ts
 * @description Service layer containing calculation engine and database CRUD for User Profiles.
 */

import { query } from '../../shared/database/pool.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import type { UpdateProfileBody, UserProfileRecord } from './user.schemas.js';

export interface CalculatedTargets {
  daily_calorie_goal: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
}

/**
 * Calculates BMR, TDEE, Calorie budget, and Macro splits using the Mifflin-St Jeor equation.
 */
export function calculateMifflinStJeor(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  gender: 'male' | 'female' | 'other',
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active',
  goal: 'lose_weight' | 'maintain_weight' | 'gain_weight',
): CalculatedTargets {
  // 1. Calculate Basal Metabolic Rate (BMR)
  let bmr = 0;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  } else {
    // female and other
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  }

  // 2. Map activity level to TDEE multiplier
  const multipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };
  const multiplier = multipliers[activityLevel] || 1.2;
  const tdee = bmr * multiplier;

  // 3. Adjust daily calories based on goal
  let calories = tdee;
  if (goal === 'lose_weight') {
    calories -= 500;
  } else if (goal === 'gain_weight') {
    calories += 500;
  }

  // Enforce healthy minimum intake (1200 kcal)
  const dailyCalorieGoal = Math.round(Math.max(1200, calories));

  // 4. Determine macro targets based on 30% Protein / 40% Carbs / 30% Fat split
  const targetProteinG = Number(((dailyCalorieGoal * 0.3) / 4).toFixed(1));
  const targetCarbsG = Number(((dailyCalorieGoal * 0.4) / 4).toFixed(1));
  const targetFatG = Number(((dailyCalorieGoal * 0.3) / 9).toFixed(1));

  return {
    daily_calorie_goal: dailyCalorieGoal,
    target_protein_g: targetProteinG,
    target_carbs_g: targetCarbsG,
    target_fat_g: targetFatG,
  };
}

/**
 * Retrieves a user profile by ID.
 */
export async function getUserProfile(userId: string): Promise<UserProfileRecord> {
  const SQL = `SELECT * FROM users WHERE id = $1 LIMIT 1`;
  const rows = await query<UserProfileRecord>(SQL, [userId]);
  if (!rows[0]) {
    throw new NotFoundError(`User with ID ${userId}`);
  }
  return rows[0];
}

/**
 * Updates a user profile, recalculating recommended macros and calorie budget
 * if mandatory metrics are present and no manual overrides are passed.
 */
export async function updateProfile(
  userId: string,
  body: UpdateProfileBody,
): Promise<UserProfileRecord> {
  // 1. Fetch current profile
  const current = await getUserProfile(userId);

  // 2. Merge updates
  const displayName = body.display_name !== undefined ? body.display_name : current.display_name;
  const weightKg = body.weight_kg !== undefined ? body.weight_kg : current.weight_kg;
  const heightCm = body.height_cm !== undefined ? body.height_cm : current.height_cm;
  const age = body.age !== undefined ? body.age : current.age;
  const gender = body.gender !== undefined ? body.gender : current.gender;
  const activityLevel = body.activity_level !== undefined ? body.activity_level : current.activity_level;
  const goal = body.goal !== undefined ? body.goal : current.goal;

  // Initial target holders
  let dailyCalorieGoal = body.daily_calorie_goal !== undefined ? body.daily_calorie_goal : current.daily_calorie_goal;
  let targetProteinG = body.target_protein_g !== undefined ? body.target_protein_g : current.target_protein_g;
  let targetCarbsG = body.target_carbs_g !== undefined ? body.target_carbs_g : current.target_carbs_g;
  let targetFatG = body.target_fat_g !== undefined ? body.target_fat_g : current.target_fat_g;

  // 3. Auto-calculate recommended targets if profile parameters are present
  // AND manual overrides are NOT explicitly provided in this update body payload
  const hasProfileParams = weightKg && heightCm && age && gender && activityLevel && goal;
  const isBypassingAutoCalc =
    body.daily_calorie_goal !== undefined ||
    body.target_protein_g !== undefined ||
    body.target_carbs_g !== undefined ||
    body.target_fat_g !== undefined;

  if (hasProfileParams && !isBypassingAutoCalc) {
    const recommended = calculateMifflinStJeor(
      Number(weightKg),
      Number(heightCm),
      Number(age),
      gender!,
      activityLevel!,
      goal!,
    );
    dailyCalorieGoal = recommended.daily_calorie_goal;
    targetProteinG = recommended.target_protein_g;
    targetCarbsG = recommended.target_carbs_g;
    targetFatG = recommended.target_fat_g;
  }

  // 4. Save updates
  const SQL = `
    UPDATE users
    SET
      display_name = $2,
      weight_kg = $3,
      height_cm = $4,
      age = $5,
      gender = $6,
      activity_level = $7,
      goal = $8,
      daily_calorie_goal = $9,
      target_protein_g = $10,
      target_carbs_g = $11,
      target_fat_g = $12,
      updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const rows = await query<UserProfileRecord>(SQL, [
    userId,
    displayName,
    weightKg,
    heightCm,
    age,
    gender,
    activityLevel,
    goal,
    dailyCalorieGoal,
    targetProteinG,
    targetCarbsG,
    targetFatG,
  ]);

  if (!rows[0]) {
    throw new NotFoundError(`User with ID ${userId}`);
  }

  return rows[0];
}
