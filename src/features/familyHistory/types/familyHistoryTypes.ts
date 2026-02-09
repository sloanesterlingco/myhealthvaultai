// src/features/familyHistory/types/familyHistoryTypes.ts
import { z } from "zod";

export const familyHistorySchema = z.object({
  id: z.string().optional(),
  relation: z.string().min(1, "Relation is required"), // e.g. "Mother"
  condition: z.string().min(1, "Condition is required"),
  diagnosedAge: z.number().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type FamilyHistoryEntry = z.infer<typeof familyHistorySchema>;
export type FamilyHistoryInput = Omit<FamilyHistoryEntry, "id" | "createdAt" | "updatedAt">;
