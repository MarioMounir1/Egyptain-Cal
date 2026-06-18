/**
 * @file modules/sponsors/sponsor.controller.ts
 * @description Fastify routes and controller handlers for Sponsors.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getActiveSponsors } from './sponsor.service.js';

export async function sponsorRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/sponsors
   * Fetch active sponsors sorted by priority descending
   */
  fastify.get(
    '/',
    {
      schema: {
        description: 'Fetch active sponsors sorted by priority descending.',
        tags: ['sponsors'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    brand_name: { type: 'string' },
                    product_name: { type: 'string' },
                    category: { type: 'string' },
                    description: { type: 'string', nullable: true },
                    cta_url: { type: 'string', nullable: true },
                    image_url: { type: 'string', nullable: true },
                    priority: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const sponsors = await getActiveSponsors();
      return reply.status(200).send({
        status: 'success',
        data: sponsors,
      });
    }
  );
}
