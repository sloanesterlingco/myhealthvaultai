// src/features/conditions/types/conditionTypes.ts
import { z } from "zod";

export const conditionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Condition name is required"),
  description: z.string().optional(),
  onsetDate: z.string().optional(), // free text or ISO
  status: z.string().optional(),    // e.g. "active", "resolved"
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type Condition = z.infer<typeof conditionSchema>;
export type ConditionInput = Omit<Condition, "id" | "createdAt" | "updatedAt">;
