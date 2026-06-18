/**
 * @file modules/auth/index.ts
 * @description Public API surface for the Auth module.
 */

export { authRoutes } from './auth.controller.js';
export { signupUser, loginUser } from './auth.service.js';
export { SignupBodySchema, LoginBodySchema } from './auth.schemas.js';
export type { SignupBody, LoginBody } from './auth.schemas.js';
