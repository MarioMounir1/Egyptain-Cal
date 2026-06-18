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
  UserStatsQuerySchema,
  type UpdateProfileBody,
  type CalculateTargetsBody,
  type UserStatsQuery,
} from './user.schemas.js';
import { LogWeightBodySchema } from './weight.schemas.js';
import { LogWaterBodySchema, GetWaterQuerySchema } from './water.schemas.js';
import {
  getUserProfile,
  updateProfile,
  calculateMifflinStJeor,
  getUserStats,
  logUserWeight,
  getWeightHistory,
  logWaterIntake,
  getDailyWaterIntake,
  deleteWaterLog,
} from './user.service.js';

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

  /**
   * GET /api/v1/users/:id/stats
   * Fetch user daily calorie aggregation and logging streak stats.
   */
  fastify.get(
    '/:id/stats',
    {
      schema: {
        description: 'Retrieve daily calorie/macro aggregated stats and logging streaks.',
        tags: ['users'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'The database UUID of the user' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            range: { type: 'string', enum: ['week', 'month'], default: 'week' },
            timezone: { type: 'string', default: 'Africa/Cairo' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  range: { type: 'string' },
                  summary: {
                    type: 'object',
                    properties: {
                      currentStreak: { type: 'integer' },
                      longestStreak: { type: 'integer' },
                      averageCalorieIntake: { type: 'integer' },
                      averageCalorieDeficitOrSurplus: { type: 'integer' },
                    },
                  },
                  history: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        date: { type: 'string' },
                        calories: { type: 'integer' },
                        protein: { type: 'number' },
                        carbs: { type: 'number' },
                        fat: { type: 'number' },
                        deficitOrSurplus: { type: 'integer' },
                        targetCalories: { type: 'integer' },
                        targetProtein: { type: 'number' },
                        targetCarbs: { type: 'number' },
                        targetFat: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      let validatedQuery: UserStatsQuery;
      try {
        validatedQuery = UserStatsQuerySchema.parse(req.query);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid query parameters', err.flatten().fieldErrors);
        }
        throw err;
      }

      const stats = await getUserStats(id, validatedQuery.range, validatedQuery.timezone);
      return reply.status(200).send({ status: 'success', data: stats });
    },
  );

  /**
   * POST /api/v1/users/:id/weight
   * Log user weight update.
   */
  fastify.post(
    '/:id/weight',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Log a new weight entry for the user. Recalculates nutritional goals.',
        tags: ['users'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['weight_kg'],
          properties: {
            weight_kg: { type: 'number', minimum: 0, description: 'Weight in kg' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      const userToken = req.user as { id: string };
      if (id !== userToken.id) {
        throw new ValidationError('You can only log weight for your own profile');
      }

      let validatedBody;
      try {
        validatedBody = LogWeightBodySchema.parse(req.body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid request payload', err.flatten().fieldErrors);
        }
        throw err;
      }

      const log = await logUserWeight(id, validatedBody.weight_kg);
      return reply.status(201).send({ status: 'success', data: log });
    }
  );

  /**
   * GET /api/v1/users/:id/weight/history
   * Retrieve user weight history.
   */
  fastify.get(
    '/:id/weight/history',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Get weight timeline history for the user.',
        tags: ['users'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      const userToken = req.user as { id: string };
      if (id !== userToken.id) {
        throw new ValidationError('You can only view your own weight history');
      }

      const history = await getWeightHistory(id);
      return reply.status(200).send({ status: 'success', data: history });
    }
  );

  /**
   * POST /api/v1/users/:id/water
   * Log user water intake.
   */
  fastify.post(
    '/:id/water',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Log water intake (ml).',
        tags: ['users'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          required: ['amount_ml'],
          properties: {
            amount_ml: { type: 'integer', minimum: 0, description: 'Amount of water in ml' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      const userToken = req.user as { id: string };
      if (id !== userToken.id) {
        throw new ValidationError('You can only log water for your own profile');
      }

      let validatedBody;
      try {
        validatedBody = LogWaterBodySchema.parse(req.body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid request payload', err.flatten().fieldErrors);
        }
        throw err;
      }

      const log = await logWaterIntake(id, validatedBody.amount_ml);
      return reply.status(201).send({ status: 'success', data: log });
    }
  );

  /**
   * GET /api/v1/users/:id/water/today
   * Fetch daily water intake logs and total.
   */
  fastify.get(
    '/:id/water/today',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Get daily water logs and total for the user (defaults to local today).',
        tags: ['users'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            timezone: { type: 'string', default: 'Africa/Cairo' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      const userToken = req.user as { id: string };
      if (id !== userToken.id) {
        throw new ValidationError('You can only view your own water logs');
      }

      let validatedQuery;
      try {
        validatedQuery = GetWaterQuerySchema.parse(req.query);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid query parameters', err.flatten().fieldErrors);
        }
        throw err;
      }

      const dateStr = validatedQuery.date || getLocalDateString(new Date(), validatedQuery.timezone);
      const data = await getDailyWaterIntake(id, dateStr, validatedQuery.timezone);
      return reply.status(200).send({ status: 'success', data });
    }
  );

  /**
   * DELETE /api/v1/users/:id/water/:logId
   * Delete a water log entry.
   */
  fastify.delete(
    '/:id/water/:logId',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Delete a water log by UUID.',
        tags: ['users'],
        params: {
          type: 'object',
          required: ['id', 'logId'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            logId: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Params: { id: string; logId: string } }>, reply: FastifyReply) => {
      const { id, logId } = req.params;
      const userToken = req.user as { id: string };
      if (id !== userToken.id) {
        throw new ValidationError('You can only delete your own water logs');
      }

      await deleteWaterLog(id, logId);
      return reply.status(200).send({ status: 'success', message: 'Water log deleted successfully' });
    }
  );
}

function getLocalDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
