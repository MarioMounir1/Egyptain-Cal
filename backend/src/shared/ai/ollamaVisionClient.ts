/**
 * @file shared/ai/ollamaVisionClient.ts
 * @description Client for image-based food analysis (photos and screenshots) using llava via Ollama.
 */

import { env } from '../../config/env.js';
import { AIEngineError } from '../errors/AppError.js';

export interface AIVisionAnalysisResult {
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

export type VisionMode = 'photo' | 'screenshot';

export async function analyzeVisionMeal(
  imageBase64: string,
  mode: VisionMode,
): Promise<AIVisionAnalysisResult> {
  if (!env.AI_ENABLED) {
    throw new AIEngineError('AI analysis is disabled.');
  }

  // Clean data URI scheme if present (e.g., "data:image/jpeg;base64,...")
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  let prompt = '';
  if (mode === 'photo') {
    prompt = `You are a clinical nutritionist and computer vision AI specializing in Egyptian cuisine.
Analyze the attached food image.
Identify the food dish(es) shown in the image and estimate their macros based on typical Egyptian serving sizes.
You must output a single JSON object with EXACTLY the following keys:
{
  "name": "Primary name of the identified food in Arabic",
  "name_en": "English name/alias of the identified food",
  "category": "Food category (e.g., 'Egyptian street food', 'stew', 'dessert', 'beverage')",
  "serving_desc": "Estimated portion/serving size description shown in the image (e.g., '1 plate (~400g)')",
  "calories": 480,
  "protein": 16.0,
  "carbs": 88.0,
  "fat": 8.0,
  "alerts": ["dietary advice, warnings, or estimated portion warnings"]
}

Rules:
1. Do not include any conversational filler. Output ONLY the raw JSON object.
2. If the food is not clear, make the best possible guess.
3. Midpoints should be realistic.
4. Output valid JSON only.`;
  } else {
    prompt = `You are an OCR and clinical nutritionist AI.
Analyze the attached screenshot, which is a menu, food delivery app (e.g., Talabat, Elmenus), or nutrition label.
Read the primary food item name and any nutrition information from this image. Extract or estimate the macros.
You must output a single JSON object with EXACTLY the following keys:
{
  "name": "Primary name of the food item in Arabic",
  "name_en": "English name/alias of the food item",
  "category": "Food category (e.g., 'Egyptian street food', 'stew', 'dessert', 'beverage')",
  "serving_desc": "Portion/serving size description if mentioned, otherwise standard portion",
  "calories": 480,
  "protein": 16.0,
  "carbs": 88.0,
  "fat": 8.0,
  "alerts": ["warnings or nutritional notes extracted from the screenshot"]
}

Rules:
1. Do not include any conversational filler. Output ONLY the raw JSON object.
2. Midpoints should be realistic.
3. Output valid JSON only.`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), env.AI_TIMEOUT_MS);

  try {
    const response = await fetch(env.AI_ENGINE_URL || 'http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.AI_VISION_MODEL,
        prompt: prompt,
        images: [cleanBase64],
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
      throw new AIEngineError('AI vision analysis request timed out.');
    }
    throw new AIEngineError(`AI vision engine failed: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }
}
