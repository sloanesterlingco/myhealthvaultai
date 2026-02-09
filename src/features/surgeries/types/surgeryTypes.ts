// src/features/surgeries/types/surgeryTypes.ts
import { z } from "zod";

export const surgerySchema = z.object({
  id: z.string().optional(),
  procedure: z.string().min(1, "Procedure name is required"),
  year: z.string().optional(),       // e.g. "2018"
  location: z.string().optional(),   // hospital/clinic
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type Surgery = z.infer<typeof surgerySchema>;
export type SurgeryInput = Omit<Surgery, "id" | "createdAt" | "updatedAt">;
