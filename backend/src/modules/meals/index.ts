/**
 * @file modules/meals/index.ts
 * @description Public API surface for the Meals module.
 * Only what is exported here is considered part of the module's public contract.
 */

export { mealRoutes } from './meal.controller.js';
export { analyzeMeal } from './meal.service.js';
export type {
  AnalyzeMealBody,
  AnalyzeMealResponse,
  MealMacroData,
} from './meal.schemas.js';
