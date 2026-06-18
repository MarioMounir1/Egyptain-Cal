/**
 * @file modules/foods/food.controller.ts
 * @description Fastify routes and controller handlers for the Foods module.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ValidationError, NotFoundError } from '../../shared/errors/AppError.js';
import {
  CreateFoodBodySchema,
  SearchFoodQuerySchema,
  type CreateFoodBody,
} from './food.schemas.js';
import { createFood, searchFoods, findById } from './food.service.js';

export async function foodRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/foods
   * Add a food item manually.
   */
  fastify.post(
    '/',
    {
      schema: {
        description: 'Manually add a food item to the database (auto-calculates 5% macro ranges).',
        tags: ['foods'],
        body: {
          type: 'object',
          required: ['name', 'calories', 'protein', 'carbs', 'fat'],
          properties: {
            name: { type: 'string', minLength: 2, description: 'Primary name of the food (Arabic preferred)' },
            name_en: { type: 'string', description: 'English translation/alias' },
            barcode: { type: 'string', description: 'UPC/EAN barcode for packaged foods' },
            category: { type: 'string', description: 'Category e.g. Egyptian street food, dairy' },
            serving_desc: { type: 'string', description: 'Serving details e.g. 1 plate, 1 cup' },
            calories: { type: 'integer', minimum: 0, description: 'Calories midpoint' },
            protein: { type: 'number', minimum: 0, description: 'Protein midpoint (g)' },
            carbs: { type: 'number', minimum: 0, description: 'Carbs midpoint (g)' },
            fat: { type: 'number', minimum: 0, description: 'Fat midpoint (g)' },
            source: {
              type: 'string',
              enum: ['manual', 'photo', 'screenshot', 'ai'],
              default: 'manual',
              description: 'Creation source for this record',
            },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      let validatedBody: CreateFoodBody;
      try {
        validatedBody = CreateFoodBodySchema.parse(req.body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid request payload', err.flatten().fieldErrors);
        }
        throw err;
      }

      const food = await createFood(validatedBody);
      return reply.status(201).send({ status: 'success', data: food });
    },
  );

  /**
   * GET /api/v1/foods/search
   * Fuzzy search food items by name.
   */
  fastify.get(
    '/search',
    {
      schema: {
        description: 'Fuzzy search food items in the database by Arabic or English name.',
        tags: ['foods'],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', minLength: 1, description: 'Search term' },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      let q: string;
      try {
        const queryParsed = SearchFoodQuerySchema.parse(req.query);
        q = queryParsed.q;
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid query parameters', err.flatten().fieldErrors);
        }
        throw err;
      }

      const results = await searchFoods(q);
      return reply.status(200).send({ status: 'success', data: results });
    },
  );

  /**
   * GET /api/v1/foods/:id
   * Retrieve a single food record by UUID.
   */
  fastify.get(
    '/:id',
    {
      schema: {
        description: 'Retrieve a single food record by its database UUID.',
        tags: ['foods'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid', description: 'The database UUID of the food record' },
          },
        },
      },
    },
    async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = req.params;
      const food = await findById(id);
      if (!food) {
        throw new NotFoundError(`Food item with ID ${id}`);
      }
      return reply.status(200).send({ status: 'success', data: food });
    },
  );
}
