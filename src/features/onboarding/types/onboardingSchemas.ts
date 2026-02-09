import { z } from "zod";

export const zOnboardingProfile = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
});

export const zOnboardingCondition = z.object({
  name: z.string(),
  onset: z.string().optional(),
  notes: z.string().optional(),
});

export const zOnboardingMedication = z.object({
  name: z.string(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  startDate: z.string().optional(),
});

export const zOnboardingAllergy = z.object({
  substance: z.string(),
  reaction: z.string().optional(),
  severity: z.enum(["mild", "moderate", "severe"]).optional(),
});

export const zOnboardingSurgery = z.object({
  name: z.string(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export const zOnboardingSocialHistory = z.object({
  smoking: z.string().optional(),
  alcohol: z.string().optional(),
  drugs: z.string().optional(),
  occupation: z.string().optional(),
});

export const zOnboardingFamilyHistory = z.object({
  relation: z.string(),
  condition: z.string(),
});

export const zOnboardingPayload = z.object({
  profile: zOnboardingProfile.optional(),
  conditions: z.array(zOnboardingCondition).optional(),
  medications: z.array(zOnboardingMedication).optional(),
  allergies: z.array(zOnboardingAllergy).optional(),
  surgeries: z.array(zOnboardingSurgery).optional(),
  socialHistory: zOnboardingSocialHistory.optional(),
  familyHistory: z.array(zOnboardingFamilyHistory).optional(),
});

export type OnboardingPayload = z.infer<typeof zOnboardingPayload>;
