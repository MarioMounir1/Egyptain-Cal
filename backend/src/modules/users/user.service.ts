/**
 * @file modules/users/user.service.ts
 * @description Service layer containing calculation engine and database CRUD for User Profiles.
 */

import { query } from '../../shared/database/pool.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import type {
  UpdateProfileBody,
  UserProfileRecord,
  DailyStat,
  UserStatsResponse,
} from './user.schemas.js';
import type { WeightLogRecord } from './weight.schemas.js';
import type { WaterLogRecord } from './water.schemas.js';

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

function getLocalDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getYesterdayLocalDateString(timezone: string): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateString(d, timezone);
}

export async function getUserStats(
  userId: string,
  range: 'week' | 'month',
  timezone: string = 'Africa/Cairo',
): Promise<UserStatsResponse['data']> {
  // 1. Fetch user targets
  const user = await getUserProfile(userId);
  const targetCal = Number(user.daily_calorie_goal || 0);
  const targetProt = Number(user.target_protein_g || 0);
  const targetCarb = Number(user.target_carbs_g || 0);
  const targetFat = Number(user.target_fat_g || 0);

  const rangeDays = range === 'week' ? 7 : 30;

  // 2. Fetch daily aggregations from DB in user's local timezone
  const AGG_SQL = `
    SELECT
      (logged_at AT TIME ZONE $2)::date::text AS log_date,
      SUM((calorie_min + calorie_max) / 2.0) AS total_calories,
      SUM((protein_min_g + protein_max_g) / 2.0) AS total_protein,
      SUM((carbs_min_g + carbs_max_g) / 2.0) AS total_carbs,
      SUM((fat_min_g + fat_max_g) / 2.0) AS total_fat
    FROM daily_calorie_logs
    WHERE user_id = $1
      AND logged_at >= NOW() - ($3 || ' days')::INTERVAL
    GROUP BY log_date
    ORDER BY log_date ASC
  `;

  interface AggRow {
    log_date: string;
    total_calories: string;
    total_protein: string;
    total_carbs: string;
    total_fat: string;
  }

  const rows = await query<AggRow>(AGG_SQL, [userId, timezone, rangeDays]);

  // 3. Fill missing dates with 0s to complete the sequence
  const history: DailyStat[] = [];
  const today = new Date();

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(d, timezone);

    const row = rows.find((r) => r.log_date === dateStr);
    const calories = row ? Math.round(Number(row.total_calories)) : 0;
    const protein = row ? Number(Number(row.total_protein).toFixed(1)) : 0;
    const carbs = row ? Number(Number(row.total_carbs).toFixed(1)) : 0;
    const fat = row ? Number(Number(row.total_fat).toFixed(1)) : 0;

    history.push({
      date: dateStr,
      calories,
      protein,
      carbs,
      fat,
      deficitOrSurplus: targetCal > 0 ? calories - targetCal : 0,
      targetCalories: targetCal,
      targetProtein: targetProt,
      targetCarbs: targetCarb,
      targetFat: targetFat,
    });
  }

  // 4. Calculate consecutive logging streaks using distinct logged days
  const STREAK_SQL = `
    SELECT DISTINCT (logged_at AT TIME ZONE $2)::date::text AS log_date
    FROM daily_calorie_logs
    WHERE user_id = $1
    ORDER BY log_date DESC
  `;

  const distinctRows = await query<{ log_date: string }>(STREAK_SQL, [userId, timezone]);
  const distinctDates = distinctRows.map((r) => r.log_date);

  let currentStreak = 0;
  let longestStreak = 0;

  if (distinctDates.length > 0) {
    const todayStr = getLocalDateString(new Date(), timezone);
    const yesterdayStr = getYesterdayLocalDateString(timezone);

    const firstDate = distinctDates[0];
    const isActive = firstDate === todayStr || firstDate === yesterdayStr;

    if (isActive) {
      currentStreak = 1;
      const expectedDate = new Date(firstDate);

      for (let i = 1; i < distinctDates.length; i++) {
        expectedDate.setDate(expectedDate.getDate() - 1);
        const expectedStr = getLocalDateString(expectedDate, timezone);
        if (distinctDates[i] === expectedStr) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak historically
    let currentRun = 1;
    let runExpectedDate = new Date(distinctDates[0]);
    longestStreak = 1;

    for (let i = 1; i < distinctDates.length; i++) {
      runExpectedDate.setDate(runExpectedDate.getDate() - 1);
      const expectedStr = getLocalDateString(runExpectedDate, timezone);

      if (distinctDates[i] === expectedStr) {
        currentRun++;
      } else {
        if (currentRun > longestStreak) {
          longestStreak = currentRun;
        }
        currentRun = 1;
        runExpectedDate = new Date(distinctDates[i]);
      }
    }
    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
  }

  // 5. Calculate nutritional averages over tracked days only
  const loggedDays = history.filter((h) => h.calories > 0);
  const averageCalorieIntake = loggedDays.length > 0
    ? Math.round(loggedDays.reduce((sum, h) => sum + h.calories, 0) / loggedDays.length)
    : 0;
  const averageCalorieDeficitOrSurplus = targetCal > 0 && averageCalorieIntake > 0
    ? averageCalorieIntake - targetCal
    : 0;

  return {
    range,
    summary: {
      currentStreak,
      longestStreak,
      averageCalorieIntake,
      averageCalorieDeficitOrSurplus,
    },
    history,
  };
}

/**
 * Log user weight update, inserting a log entry and syncing the user profile.
 */
export async function logUserWeight(userId: string, weightKg: number): Promise<WeightLogRecord> {
  // Insert log entry
  const SQL = `
    INSERT INTO weight_logs (user_id, weight_kg)
    VALUES ($1, $2)
    RETURNING id, user_id, weight_kg, logged_at
  `;
  const rows = await query<WeightLogRecord>(SQL, [userId, weightKg]);
  const log = rows[0];
  if (!log) {
    throw new Error('Failed to log weight');
  }

  // Update profile weight (which also recalculates recommended targets)
  await updateProfile(userId, { weight_kg: weightKg });

  return log;
}

/**
 * Retrieve user weight log timeline.
 */
export async function getWeightHistory(userId: string): Promise<WeightLogRecord[]> {
  const SQL = `
    SELECT id, user_id, weight_kg, logged_at
    FROM weight_logs
    WHERE user_id = $1
    ORDER BY logged_at DESC
  `;
  return await query<WeightLogRecord>(SQL, [userId]);
}

/**
 * Log user water intake.
 */
export async function logWaterIntake(userId: string, amountMl: number): Promise<WaterLogRecord> {
  const SQL = `
    INSERT INTO water_logs (user_id, amount_ml)
    VALUES ($1, $2)
    RETURNING id, user_id, amount_ml, logged_at
  `;
  const rows = await query<WaterLogRecord>(SQL, [userId, amountMl]);
  const log = rows[0];
  if (!log) {
    throw new Error('Failed to log water intake');
  }
  return log;
}

/**
 * Get daily water logs and total intake for a user on a given date and timezone.
 */
export async function getDailyWaterIntake(
  userId: string,
  dateStr: string,
  timezone: string = 'Africa/Cairo'
): Promise<{ total_ml: number; logs: WaterLogRecord[] }> {
  const SQL = `
    SELECT id, user_id, amount_ml, logged_at
    FROM water_logs
    WHERE user_id = $1
      AND (logged_at AT TIME ZONE $2)::date = $3::date
    ORDER BY logged_at DESC
  `;
  const logs = await query<WaterLogRecord>(SQL, [userId, timezone, dateStr]);
  const total_ml = logs.reduce((sum, log) => sum + Number(log.amount_ml), 0);
  return { total_ml, logs };
}

/**
 * Delete a water log entry.
 */
export async function deleteWaterLog(userId: string, logId: string): Promise<void> {
  const SQL = `
    DELETE FROM water_logs
    WHERE id = $1 AND user_id = $2
    RETURNING id
  `;
  const rows = await query<{ id: string }>(SQL, [logId, userId]);
  if (rows.length === 0) {
    throw new ValidationError('Water log not found or does not belong to user');
  }
}


