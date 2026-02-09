// src/features/patient/models/patientSchemas.ts
import { z } from "zod";

/**
 * CORE PATIENT DATA
 */
export const PatientCoreSchema = z.object({
  id: z.string(), // Firestore doc ID / auth UID
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z.string().optional(), // "YYYY-MM-DD"
  sexAtBirth: z.enum(["male", "female", "other"]).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  primaryProviderId: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});

export type PatientCore = z.infer<typeof PatientCoreSchema>;

/**
 * CONDITIONS
 */
export const ConditionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Condition name is required"),
  diagnosed: z.string().optional(),
  status: z.enum(["active", "resolved", "unknown"]).optional(),
  relatedMedications: z.array(z.string()).optional(),
  notes: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type Condition = z.infer<typeof ConditionSchema>;

/**
 * MEDICATIONS
 */
export const MedicationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Medication name is required"),
  dose: z.string().optional(),
  frequency: z.string().optional(),
  reason: z.string().optional(),
  issues: z.string().optional(),
  startedAt: z.string().optional(),
  stoppedAt: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type Medication = z.infer<typeof MedicationSchema>;

/**
 * ALLERGIES
 */
export const AllergySchema = z.object({
  id: z.string().optional(),
  substance: z.string().min(1, "Allergen is required"),
  reaction: z.string().optional(),
  severity: z.enum(["mild", "moderate", "severe", "unknown"]).optional(),
  year: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type Allergy = z.infer<typeof AllergySchema>;

/**
 * SURGERIES
 */
export const SurgerySchema = z.object({
  id: z.string().optional(),
  procedure: z.string().min(1, "Procedure description is required"),
  year: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type Surgery = z.infer<typeof SurgerySchema>;

/**
 * FAMILY HISTORY
 */
export const FamilyHistoryItemSchema = z
  .object({
    id: z.string().optional(),
    // Accept either field name from older/newer UI
    relation: z.string().min(1, "Relation is required").optional(),
    relative: z.string().min(1, "Relation is required").optional(),
    condition: z.string().min(1, "Condition is required"),
    diagnosedAge: z.number().int().positive().optional(),
    notes: z.string().optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
  })
  .refine((v) => Boolean(v.relation || v.relative), {
    message: "Relation is required",
    path: ["relation"],
  })
  .transform((v) => ({
    ...v,
    relation: (v.relation ?? v.relative) as string,
  }));
export type FamilyHistoryItem = z.infer<typeof FamilyHistoryItemSchema>;

/**
 * SOCIAL HISTORY
 */
export const SocialHistorySchema = z.object({
  tobacco: z.string().optional(),
  alcohol: z.string().optional(),
  exercise: z.string().optional(),
  diet: z.string().optional(),
  sleep: z.string().optional(),
  occupation: z.string().optional(),
  livingSituation: z.string().optional(),
  substances: z.string().optional(),
});
export type SocialHistory = z.infer<typeof SocialHistorySchema>;

/**
 * VITALS
 */
export const VitalSchema = z.object({
  id: z.string().optional(),
  type: z.enum([
    "bloodPressure",
    "heartRate",
    "weight",
    "height",
    "oxygenSaturation",
    "bloodSugar",
    "temperature",
    "other",
  ]),
  label: z.string().optional(),
  value: z.string().min(1, "Value is required"),
  units: z.string().optional(),
  date: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type Vital = z.infer<typeof VitalSchema>;

/**
 * LAB RESULTS
 */
export const LabResultSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Lab name is required"),
  value: z.string().min(1, "Lab value is required"),
  units: z.string().optional(),
  referenceRange: z.string().optional(),
  date: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type LabResult = z.infer<typeof LabResultSchema>;

/**
 * SYMPTOMS
 */
export const SymptomEntrySchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Symptom description is required"),
  intensity: z.number().min(0).max(10).optional(),
  onset: z.string().optional(),
  triggers: z.string().optional(),
  relief: z.string().optional(),
  frequency: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type SymptomEntry = z.infer<typeof SymptomEntrySchema>;

/**
 * FULL PATIENT PROFILE
 */
export const PatientProfileSchema = z.object({
  core: PatientCoreSchema,
  socialHistory: SocialHistorySchema.optional(),
  conditions: z.array(ConditionSchema).optional(),
  medications: z.array(MedicationSchema).optional(),
  allergies: z.array(AllergySchema).optional(),
  surgeries: z.array(SurgerySchema).optional(),
  familyHistory: z.array(FamilyHistoryItemSchema).optional(),
  vitals: z.array(VitalSchema).optional(),
  labs: z.array(LabResultSchema).optional(),
  symptoms: z.array(SymptomEntrySchema).optional(),
});
export type PatientProfile = z.infer<typeof PatientProfileSchema>;
