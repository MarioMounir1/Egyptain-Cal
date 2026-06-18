/**
 * @file modules/users/index.ts
 * @description Public API surface for the Users module.
 */

export { userRoutes } from './user.controller.js';
export {
  getUserProfile,
  updateProfile,
  calculateMifflinStJeor,
} from './user.service.js';
export type {
  UpdateProfileBody,
  CalculateTargetsBody,
  UserProfileRecord,
  UserStatsQuery,
  DailyStat,
  UserStatsResponse,
} from './user.schemas.js';
export { UserStatsQuerySchema } from './user.schemas.js';
