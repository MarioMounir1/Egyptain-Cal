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
  type AnalyzeMealBody,
  type AnalyzePhotoMealBody,
} from './meal.schemas.js';
import { analyzeMeal, analyzePhotoMeal } from './meal.service.js';

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
   * GET /api/v1/meals/health
   * Simple module-level health check.
   */
  fastify.get('/health', async (_req, reply) => {
    return reply.status(200).send({ status: 'ok', module: 'meals' });
  });
}
