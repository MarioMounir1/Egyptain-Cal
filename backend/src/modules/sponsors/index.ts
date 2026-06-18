/**
 * @file modules/sponsors/index.ts
 * @description Public API surface for the Sponsors module.
 */

export { sponsorRoutes } from './sponsor.controller.js';
export { getActiveSponsors } from './sponsor.service.js';
export type { SponsorRecord } from './sponsor.service.js';
