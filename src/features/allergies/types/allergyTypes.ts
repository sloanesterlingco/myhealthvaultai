// src/features/allergies/types/allergyTypes.ts
import { z } from "zod";

export const allergySeverityEnum = z.enum(["mild", "moderate", "severe"]);

export const allergySchema = z.object({
  id: z.string().optional(),
  substance: z.string().min(1, "Substance is required"),
  reaction: z.string().optional(),
  severity: allergySeverityEnum.optional(),
  notes: z.string().optional(),
  year: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type Allergy = z.infer<typeof allergySchema>;
export type AllergyInput = Omit<Allergy, "id" | "createdAt" | "updatedAt">;
