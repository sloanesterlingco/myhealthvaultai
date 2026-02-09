// ---------------------------------------------------------
// EMR Connection Store - lookup EMR config per tenant
// ---------------------------------------------------------

import { EmrConnectionConfig, EmrVendor } from "./types";

/**
 * In production, you'll likely:
 * - fetch from your database
 * - cache in memory
 * - expose an admin UI to manage EMR configs
 *
 * For now, this is a placeholder in-memory store pattern.
 */

const mockConfigByTenant: Record<string, EmrConnectionConfig> = {};

export async function getEmrConnectionConfig(
  tenantId: string
): Promise<EmrConnectionConfig | null> {
  // TODO: replace with real data store fetch.
  return mockConfigByTenant[tenantId] ?? null;
}

/**
 * Optional helper to set configs programmatically in dev environments.
 * You can remove this in production or guard by env flag.
 */
export async function setEmrConnectionConfig(
  config: EmrConnectionConfig
): Promise<void> {
  mockConfigByTenant[config.tenantId] = config;
}

/**
 * Convenience: create a simple default config for local/testing use.
 */
export function createLocalEpicConfig(tenantId: string): EmrConnectionConfig {
  return {
    id: `local-epic-${tenantId}`,
    tenantId,
    vendor: EmrVendor.Epic,
    baseUrl: "https://example-epic.test",
    authType: "apiKey",
    apiKey: "REPLACE_ME",
    isSandbox: true,
  };
}
