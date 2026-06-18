/**
 * @file api/meals.ts
 * @description API client for the Egyptian Cal Meal Analysis endpoint.
 */

export interface MealMacroData {
  calorieRange: string;
  proteinRange: string;
  carbsRange:   string;
  fatRange:     string;
  alerts:       string[];
}

export interface AnalyzeMealResponse {
  status: 'success';
  data:   MealMacroData;
  meta: {
    userId:      string;
    analyzedAt:  string;
    logId:       string;
  };
}

export interface APIErrorResponse {
  status:  'error';
  code:    string;
  message: string;
  details?: unknown;
}

const BASE_URL = '/api/v1';

export async function analyzeMeal(
  rawText: string,
  userId: string,
): Promise<AnalyzeMealResponse> {
  const response = await fetch(`${BASE_URL}/meals/analyze`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ rawText, userId }),
  });

  const json = await response.json() as AnalyzeMealResponse | APIErrorResponse;

  if (!response.ok) {
    const err = json as APIErrorResponse;
    throw new Error(err.message ?? `Request failed with status ${response.status}`);
  }

  return json as AnalyzeMealResponse;
}
