/**
 * @file modules/foods/index.ts
 * @description Public API surface for the Foods module.
 */

export { foodRoutes } from './food.controller.js';
export {
  createFood,
  searchFoods,
  findById,
  findByName,
  findByBarcode,
  computeIntRange,
  computeDecimalRange,
} from './food.service.js';
export type {
  CreateFoodBody,
  SearchFoodQuery,
  FoodRecord,
} from './food.schemas.js';
