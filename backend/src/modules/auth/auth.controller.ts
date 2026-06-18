/**
 * @file modules/auth/auth.controller.ts
 * @description Fastify routes and controller handlers for Authentication.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { ValidationError } from '../../shared/errors/AppError.js';
import { SignupBodySchema, LoginBodySchema } from './auth.schemas.js';
import { signupUser, loginUser } from './auth.service.js';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/auth/signup
   * Register a new user
   */
  fastify.post(
    '/signup',
    {
      schema: {
        description: 'Register a new user profile with email, password, and display name.',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password', 'display_name'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            display_name: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      let validated;
      try {
        validated = SignupBodySchema.parse(req.body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid signup data', err.flatten().fieldErrors);
        }
        throw err;
      }

      const user = await signupUser(validated.email, validated.password, validated.display_name);
      return reply.status(201).send({
        status: 'success',
        data: user,
      });
    }
  );

  /**
   * POST /api/v1/auth/login
   * Authenticate a user and return a signed JWT token
   */
  fastify.post(
    '/login',
    {
      schema: {
        description: 'Authenticate with email and password to receive a JWT token.',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      let validated;
      try {
        validated = LoginBodySchema.parse(req.body);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new ValidationError('Invalid login data', err.flatten().fieldErrors);
        }
        throw err;
      }

      const user = await loginUser(validated.email, validated.password);

      // Sign JWT
      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        display_name: user.display_name,
      });

      return reply.status(200).send({
        status: 'success',
        data: {
          token,
          user,
        },
      });
    }
  );
}
