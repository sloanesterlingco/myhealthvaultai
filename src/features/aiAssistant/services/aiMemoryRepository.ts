/**
 * @deprecated Replaced by Firestore-backed EMR in patientAggregationService.
 * This file is kept temporarily so older imports still compile.
 * Do not use in new code.
 */

// Keep the type import if other code relies on it, but do NOT import firebase here.
import type { PatientAggregationModel } from "./patientAggregationService";

export type StoredAIMemoryDoc = {
  uid: string;
  patient: PatientAggregationModel;
  createdAt?: any;
  updatedAt?: any;
};

/**
 * Stubbed repository:
 * - load() returns null so callers can fall back to the EMR doc
 * - save()/ensureExists() are no-ops to avoid writing to the deprecated collection
 */
export const aiMemoryRepository = {
  async load(): Promise<PatientAggregationModel | null> {
    return null;
  },

  async save(_patient: PatientAggregationModel): Promise<void> {
    // no-op (deprecated)
  },

  async ensureExists(_patient: PatientAggregationModel): Promise<void> {
    // no-op (deprecated)
  },
};
