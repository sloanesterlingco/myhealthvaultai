// src/features/vitals/services/vitalsService.ts
import { vitalsRepository } from "./vitalsRepository";
import type {
  AddVitalInput,
  UpdateVitalInput,
  VitalDoc,
  VitalType,
} from "./vitalsRepository";

export const vitalsService = {
  // Used by AddVital / forms
  async addVital(input: AddVitalInput, userIdOverride?: string): Promise<string> {
    return vitalsRepository.addVital(input, userIdOverride);
  },

  async updateVital(input: UpdateVitalInput): Promise<void> {
    return vitalsRepository.updateVital(input);
  },

  async deleteVital(id: string): Promise<void> {
    return vitalsRepository.deleteVital(id);
  },

  // Used by charts/history screens
  async getVitalHistory(
    type: VitalType,
    take: number = 50,
    userIdOverride?: string
  ): Promise<VitalDoc[]> {
    return vitalsRepository.getHistoryByType(type, take, userIdOverride);
  },

  // ✅ Used by dashboards/lists: recent vitals across all types
  async getAllVitals(take: number = 200, userIdOverride?: string): Promise<VitalDoc[]> {
    return vitalsRepository.getRecentAll(take, userIdOverride);
  },

  // ✅ Convenience: latest value per type
  async getLatestByType(type: VitalType, userIdOverride?: string): Promise<VitalDoc | null> {
    const list = await vitalsRepository.getHistoryByType(type, 1, userIdOverride);
    return list[0] ?? null;
  },
};

// re-export useful types so existing imports don’t break
export type { VitalDoc, VitalType };
