/**
 * @file modules/meals/meal.controller.ts
 * @description Fastify route controller for the Meals module.
 * Handles HTTP concerns only — delegates all business logic to meal.service.ts
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ValidationError } from '../../shared/errors/AppError.js';
import {
  AnalyzeMealBodySchema,
  AnalyzePhotoMealBodySchema,
  MealPlanQuerySchema,
  GetMealsQuerySchema,
  type AnalyzeMealBody,
  type AnalyzePhotoMealBody,
  type MealPlanQuery,
  type GetMealsQuery,
} from './meal.schemas.js';
import {
  analyzeMeal,
  analyzePhotoMeal,
  generateMealPlan,
  getMealsByDate,
  deleteMealLog,
} from './meal.service.js';

export async function mealRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/meals/analyze
   *
   * Body: { rawText: string, userId: string }
   *
   * Validates input with Zod, delegates to analyzeMeal service,
   * and returns the bracketed macro result.
   */
  fastify.post(
    '/analyze',
    {
      schema: {
        description: 'Analyze a raw meal text description and return AI-computed macro ranges.',
        tags: ['meals'],
        body: {
          type: 'object',
          required: ['rawText', 'userId'],
          properties: {
            rawText: {
              type: 'string',
              minLength: 3,
              maxLength: 500,
              description: 'Raw meal description in Arabic or English',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'The ID of the authenticated user',
            },
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
                  calorieRange: { type: 'string' },
                  proteinRange: { type: 'string' },
                  carbsRange:   { type: 'string' },
                  fatRange:     { type: 'string' },
                  alerts:       { type: 'array', items: { type: 'string' } },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  userId:     { type: 'string' },
                  analyzedAt: { type: 'string' },
                  logId:      { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      // ── Runtime Zod validation ────────────────────────────────────────
      let validatedBody: AnalyzeMealBody;
      try {
        validatedBody = AnalyzeMealBodySchema.parse(req.body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid request payload', err.flatten().fieldErrors);
        }
        throw err;
      }

      const result = await analyzeMeal(validatedBody);
      return reply.status(200).send(result);
    },
  );

  /**
   * POST /api/v1/meals/analyze-photo
   *
   * Body: { image: string, userId: string, mode?: 'photo' | 'screenshot' }
   */
  fastify.post(
    '/analyze-photo',
    {
      schema: {
        description: 'Analyze a meal from an uploaded image (photo or screenshot) and return AI-computed macro ranges.',
        tags: ['meals'],
        body: {
          type: 'object',
          required: ['image', 'userId'],
          properties: {
            image: {
              type: 'string',
              description: 'Base64 encoded image string',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'The ID of the authenticated user',
            },
            mode: {
              type: 'string',
              enum: ['photo', 'screenshot'],
              default: 'photo',
              description: 'Analysis mode: photo of food or app screenshot',
            },
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
                  calorieRange: { type: 'string' },
                  proteinRange: { type: 'string' },
                  carbsRange:   { type: 'string' },
                  fatRange:     { type: 'string' },
                  alerts:       { type: 'array', items: { type: 'string' } },
                },
              },
              meta: {
                type: 'object',
                properties: {
                  userId:     { type: 'string' },
                  analyzedAt: { type: 'string' },
                  logId:      { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      let validatedBody: AnalyzePhotoMealBody;
      try {
        validatedBody = AnalyzePhotoMealBodySchema.parse(req.body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid request payload', err.flatten().fieldErrors);
        }
        throw err;
      }

      const result = await analyzePhotoMeal(validatedBody);
      return reply.status(200).send(result);
    },
  );

  /**
   * GET /api/v1/meals/plan
   *
   * Query: { userId: string }
   */
  fastify.get(
    '/plan',
    {
      schema: {
        description: 'Generate a personalized daily meal plan based on user macro targets.',
        tags: ['meals'],
        querystring: {
          type: 'object',
          required: ['userId'],
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'The ID of the user to generate a plan for',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              source: { type: 'string' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    mealType: { type: 'string' },
                    foodId: { type: 'string', nullable: true },
                    name: { type: 'string' },
                    name_en: { type: 'string', nullable: true },
                    category: { type: 'string', nullable: true },
                    serving_desc: { type: 'string', nullable: true },
                    caloriesRange: { type: 'string' },
                    proteinRange: { type: 'string' },
                    carbsRange: { type: 'string' },
                    fatRange: { type: 'string' },
                    alerts: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
              totals: {
                type: 'object',
                properties: {
                  calories: {
                    type: 'object',
                    properties: {
                      target: { type: 'integer' },
                      actual: { type: 'integer' },
                    },
                  },
                  protein: {
                    type: 'object',
                    properties: {
                      target: { type: 'number' },
                      actual: { type: 'number' },
                    },
                  },
                  carbs: {
                    type: 'object',
                    properties: {
                      target: { type: 'number' },
                      actual: { type: 'number' },
                    },
                  },
                  fat: {
                    type: 'object',
                    properties: {
                      target: { type: 'number' },
                      actual: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      let validatedQuery: MealPlanQuery;
      try {
        validatedQuery = MealPlanQuerySchema.parse(req.query);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid query parameters', err.flatten().fieldErrors);
        }
        throw err;
      }

      const result = await generateMealPlan(validatedQuery.userId);
      return reply.status(200).send(result);
    },
  );

  /**
   * GET /api/v1/meals
   * Fetch daily logs for a given date.
   */
  fastify.get(
    '/',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Get daily meal logs for a specific date (defaults to local today).',
        tags: ['meals'],
        querystring: {
          type: 'object',
          properties: {
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$', description: 'Date in YYYY-MM-DD format' },
            timezone: { type: 'string', default: 'Africa/Cairo' },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      let validatedQuery: GetMealsQuery;
      try {
        validatedQuery = GetMealsQuerySchema.parse(req.query);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid query parameters', err.flatten().fieldErrors);
        }
        throw err;
      }

      const user = req.user as { id: string };
      const dateStr = validatedQuery.date || getLocalDateString(new Date(), validatedQuery.timezone);
      const meals = await getMealsByDate(user.id, dateStr, validatedQuery.timezone);
      return reply.status(200).send({ status: 'success', data: meals });
    }
  );

  /**
   * DELETE /api/v1/meals/:id
   * Delete a meal log entry.
   */
  fastify.delete(
    '/:id',
    {
      preValidation: [fastify.authenticate],
      schema: {
        description: 'Delete a meal log by UUID.',
        tags: ['meals'],
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
      const user = req.user as { id: string };
      await deleteMealLog(user.id, id);
      return reply.status(200).send({ status: 'success', message: 'Meal log deleted successfully' });
    }
  );

  /**
   * GET /api/v1/meals/health
   * Simple module-level health check.
   */
  fastify.get('/health', async (_req, reply) => {
    return reply.status(200).send({ status: 'ok', module: 'meals' });
  });
}

function getLocalDateString(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
