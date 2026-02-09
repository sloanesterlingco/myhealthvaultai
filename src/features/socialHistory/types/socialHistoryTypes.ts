// src/features/socialHistory/types/socialHistoryTypes.ts
import { z } from "zod";

export const socialHistorySchema = z.object({
  smoking: z.string().optional(),
  alcohol: z.string().optional(),
  drugs: z.string().optional(),
  exercise: z.string().optional(),
  occupation: z.string().optional(),
  livingSituation: z.string().optional(),
  diet: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type SocialHistory = z.infer<typeof socialHistorySchema>;
export type SocialHistoryInput = Omit<SocialHistory, "createdAt" | "updatedAt">;
