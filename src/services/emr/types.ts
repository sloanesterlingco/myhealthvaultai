// ---------------------------------------------------------
// EMR Types - shared across EMR clients and sync service
// ---------------------------------------------------------

export enum EmrVendor {
  Epic = "epic",
  Cerner = "cerner",
  Generic = "generic",
}

export type EmrAuthType = "oauth2" | "apiKey" | "none";

export interface EmrConnectionConfig {
  id: string;
  tenantId: string;
  vendor: EmrVendor;
  baseUrl: string;

  authType: EmrAuthType;
  clientId?: string;
  clientSecret?: string;
  apiKey?: string;
  scopes?: string[];

  isSandbox?: boolean;
  metadata?: Record<string, unknown>;
}

export interface EmrSyncResult {
  success: boolean;
  externalId?: string;
  httpStatus?: number;
  errorCode?: string;
  errorMessage?: string;
  raw?: unknown;
}

// These are EMR-agnostic payloads that vendor clients receive.
export interface EmrPatientPayload {
  data: Record<string, unknown>;
}

export interface EmrVitalsPayload {
  data: Record<string, unknown>;
}

export interface EmrBundlePayload {
  data: Record<string, unknown>;
}

// Core client interface that all EMR vendor implementations must satisfy.
export interface IEmrClient {
  healthCheck(): Promise<EmrSyncResult>;

  pushPatient(payload: EmrPatientPayload): Promise<EmrSyncResult>;
  pushVitals(payload: EmrVitalsPayload): Promise<EmrSyncResult>;

  /**
   * Optional, for vendors that support bulk FHIR Bundles.
   * If unsupported, implementation can either:
   * - throw, or
   * - delegate to patient/vitals calls internally.
   */
  pushBundle?(payload: EmrBundlePayload): Promise<EmrSyncResult>;
}
