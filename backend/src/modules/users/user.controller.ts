/**
 * @file modules/users/user.controller.ts
 * @description Fastify routes and controller handlers for User Profiles.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ValidationError } from '../../shared/errors/AppError.js';
import {
  UpdateProfileBodySchema,
  CalculateTargetsBodySchema,
  type UpdateProfileBody,
  type CalculateTargetsBody,
} from './user.schemas.js';
import { getUserProfile, updateProfile, calculateMifflinStJeor } from './user.service.js';

export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/users/:id
   * Fetch a user profile record.
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Get user profile and current macro/calorie targets by UUID.',
        tags: ['users'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'The database UUID of the user' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      const profile = await getUserProfile(id);
      return reply.status(200).send({ status: 'success', data: profile });
    },
  );

  /**
   * PUT /api/v1/users/:id
   * Update user profile (automatically recalculates calorie and macro goals).
   */
  fastify.put(
    '/:id',
    {
      schema: {
        description: 'Update user profile metrics. Automatically calculates targets if not manually overridden.',
        tags: ['users'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'The database UUID of the user' },
          },
        },
        body: {
          type: 'object',
          properties: {
            display_name: { type: 'string' },
            weight_kg: { type: 'number', minimum: 0, description: 'Weight in kg' },
            height_cm: { type: 'number', minimum: 0, description: 'Height in cm' },
            age: { type: 'integer', minimum: 0, description: 'Age in years' },
            gender: { type: 'string', enum: ['male', 'female', 'other'] },
            activity_level: {
              type: 'string',
              enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
            },
            goal: { type: 'string', enum: ['lose_weight', 'maintain_weight', 'gain_weight'] },
            daily_calorie_goal: { type: 'integer', description: 'Manual calorie budget override' },
            target_protein_g: { type: 'number', description: 'Manual protein target override (g)' },
            target_carbs_g: { type: 'number', description: 'Manual carbs target override (g)' },
            target_fat_g: { type: 'number', description: 'Manual fat target override (g)' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      let validatedBody: UpdateProfileBody;
      try {
        validatedBody = UpdateProfileBodySchema.parse(req.body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid request payload', err.flatten().fieldErrors);
        }
        throw err;
      }

      const updated = await updateProfile(id, validatedBody);
      return reply.status(200).send({ status: 'success', data: updated });
    },
  );

  /**
   * POST /api/v1/users/calculate
   * Compute Recommended targets on the fly without saving (calculator preview).
   */
  fastify.post(
    '/calculate',
    {
      schema: {
        description: 'Calculate recommended calorie and macro targets on the fly without saving.',
        tags: ['users'],
        body: {
          type: 'object',
          required: ['weight_kg', 'height_cm', 'age', 'gender', 'activity_level', 'goal'],
          properties: {
            weight_kg: { type: 'number', minimum: 0, description: 'Weight in kg' },
            height_cm: { type: 'number', minimum: 0, description: 'Height in cm' },
            age: { type: 'integer', minimum: 0, description: 'Age in years' },
            gender: { type: 'string', enum: ['male', 'female', 'other'] },
            activity_level: {
              type: 'string',
              enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
            },
            goal: { type: 'string', enum: ['lose_weight', 'maintain_weight', 'gain_weight'] },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      let validatedBody: CalculateTargetsBody;
      try {
        validatedBody = CalculateTargetsBodySchema.parse(req.body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid request payload', err.flatten().fieldErrors);
        }
        throw err;
      }

      const results = calculateMifflinStJeor(
        validatedBody.weight_kg,
        validatedBody.height_cm,
        validatedBody.age,
        validatedBody.gender,
        validatedBody.activity_level,
        validatedBody.goal,
      );

      return reply.status(200).send({ status: 'success', data: results });
    },
  );
}
