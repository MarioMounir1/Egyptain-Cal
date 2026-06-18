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
