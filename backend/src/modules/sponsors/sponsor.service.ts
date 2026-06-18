/**
 * @file modules/sponsors/sponsor.service.ts
 * @description Service layer for the Sponsors module.
 */

import { query } from '../../shared/database/pool.js';

export interface SponsorRecord {
  id: string;
  brand_name: string;
  product_name: string;
  category: string;
  description: string | null;
  cta_url: string | null;
  image_url: string | null;
  priority: number;
}

/**
 * Retrieve active sponsors sorted by priority descending.
 */
export async function getActiveSponsors(): Promise<SponsorRecord[]> {
  const SQL = `
    SELECT id, brand_name, product_name, category, description, cta_url, image_url, priority
    FROM sponsors
    WHERE is_active = TRUE
    ORDER BY priority DESC
  `;
  return await query<SponsorRecord>(SQL);
}
