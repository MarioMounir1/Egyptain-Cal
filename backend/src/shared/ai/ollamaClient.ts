/**
 * @file shared/ai/ollamaClient.ts
 * @description Client for text-based food/meal nutritional analysis using llama3 via Ollama.
 */

import { env } from '../../config/env.js';
import { AIEngineError } from '../errors/AppError.js';

export interface AITextAnalysisResult {
  name: string;
  name_en: string | null;
  category: string;
  serving_desc: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  alerts: string[];
}

export async function analyzeTextMeal(rawText: string): Promise<AITextAnalysisResult> {
  if (!env.AI_ENABLED) {
    throw new AIEngineError('AI analysis is disabled.');
  }

  const prompt = `You are an expert clinical nutritionist specializing in Egyptian cuisine.
Analyze the following food item or meal description: "${rawText}"

Provide a structured, accurate nutritional analysis of the meal. Keep portion sizes standard for typical Egyptian servings (e.g., standard plate, standard loaf, standard cup).
You must output a single JSON object with EXACTLY the following keys:
{
  "name": "Primary name of the food in Arabic",
  "name_en": "English name/alias of the food",
  "category": "Food category (e.g., 'Egyptian street food', 'stew', 'dessert', 'beverage')",
  "serving_desc": "Typical serving size description (e.g., '1 plate (~400g)', '1 medium loaf', '1 cup')",
  "calories": 480,
  "protein": 16.0,
  "carbs": 88.0,
  "fat": 8.0,
  "alerts": ["warning/health alert if any, otherwise standard dietary advice"]
}

Rules:
1. Do not include any conversational filler. Output ONLY the raw JSON object.
2. If the food is not recognized, estimate the closest matching standard Egyptian dish.
3. Midpoints should be realistic.
4. Output valid JSON only.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const response = await fetch(env.AI_ENGINE_URL || 'http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        prompt: prompt,
        stream: false,
        format: 'json',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama server returned status ${response.status}`);
    }

    const data = (await response.json()) as { response: string };
    
    // Parse the inner JSON string returned by Ollama's generate endpoint
    const result = JSON.parse(data.response.trim());

    // Validate structure roughly
    if (
      typeof result.name !== 'string' ||
      typeof result.calories !== 'number' ||
      typeof result.protein !== 'number' ||
      typeof result.carbs !== 'number' ||
      typeof result.fat !== 'number'
    ) {
      throw new Error('AI response is missing required fields or has incorrect types.');
    }

    return {
      name: result.name,
      name_en: result.name_en || null,
      category: result.category || 'unknown',
      serving_desc: result.serving_desc || '1 portion',
      calories: Math.round(result.calories),
      protein: Number(result.protein),
      carbs: Number(result.carbs),
      fat: Number(result.fat),
      alerts: Array.isArray(result.alerts) ? result.alerts : [],
    };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new AIEngineError('AI analysis request timed out.');
    }
    throw new AIEngineError(`AI engine failed: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface AIMealPlanItem {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  name: string;
  name_en: string | null;
  category: string;
  serving_desc: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  alerts: string[];
}

export async function generateAIMealPlan(
  caloriesTarget: number,
  proteinTarget: number,
  carbsTarget: number,
  fatTarget: number,
): Promise<AIMealPlanItem[]> {
  if (!env.AI_ENABLED) {
    throw new AIEngineError('AI plan generation is disabled.');
  }

  const prompt = `You are an expert clinical nutritionist specializing in Egyptian cuisine.
Generate a personalized single-day Egyptian meal plan matching these exact daily targets:
- Daily Calorie Goal: ${caloriesTarget} kcal
- Target Protein: ${proteinTarget}g
- Target Carbs: ${carbsTarget}g
- Target Fat: ${fatTarget}g

The plan must contain exactly 4 meals: Breakfast, Lunch, Dinner, and Snack.
All dishes must be authentic, common Egyptian meals (e.g. Ful Medames, Koshary, Molokhia, Grilled Kofta, Baladi bread, Feta cheese, etc.).

Provide a structured, accurate nutritional analysis of each meal. Midpoint values must sum up approximately to the daily targets.
You must output a single JSON object containing a "meals" array with EXACTLY 4 objects:
{
  "meals": [
    {
      "meal_type": "breakfast",
      "name": "Arabic name of the dish",
      "name_en": "English name of the dish",
      "category": "Food category (e.g. 'dairy', 'grains', 'Egyptian street food')",
      "serving_desc": "Portion size description (e.g. '1 plate (~300g) with 1/2 baladi bread')",
      "calories": 500,
      "protein": 20,
      "carbs": 60,
      "fat": 15,
      "alerts": ["dietary tip/warning for this meal"]
    },
    ...
  ]
}

Rules:
1. Do not include any conversational filler. Output ONLY the raw JSON object.
2. The total sum of calories, protein, carbs, and fat across the 4 meals must be extremely close to the requested daily targets: Calories (~${caloriesTarget}), Protein (~${proteinTarget}g), Carbs (~${carbsTarget}g), Fat (~${fatTarget}g).
3. Output valid JSON only.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const response = await fetch(env.AI_ENGINE_URL || 'http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        prompt: prompt,
        stream: false,
        format: 'json',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama server returned status ${response.status}`);
    }

    const data = (await response.json()) as { response: string };
    const result = JSON.parse(data.response.trim());

    if (!result || !Array.isArray(result.meals) || result.meals.length !== 4) {
      throw new Error('AI response is missing the meals array or does not contain exactly 4 meals.');
    }

    const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    return result.meals.map((meal: any) => {
      if (!meal.name || typeof meal.calories !== 'number') {
        throw new Error('AI meal item is missing required fields.');
      }
      return {
        meal_type: validMealTypes.includes(meal.meal_type) ? meal.meal_type : 'snack',
        name: String(meal.name),
        name_en: meal.name_en ? String(meal.name_en) : null,
        category: meal.category ? String(meal.category) : 'unknown',
        serving_desc: meal.serving_desc ? String(meal.serving_desc) : '1 portion',
        calories: Math.round(meal.calories),
        protein: Number(meal.protein || 0),
        carbs: Number(meal.carbs || 0),
        fat: Number(meal.fat || 0),
        alerts: Array.isArray(meal.alerts) ? meal.alerts.map(String) : [],
      };
    });
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new AIEngineError('AI plan generation request timed out.');
    }
    throw new AIEngineError(`AI plan generator failed: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
