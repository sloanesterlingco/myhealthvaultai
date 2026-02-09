// src/features/onboarding/services/onboardingPipeline.ts

import { z } from "zod";
import { auth } from "../../../lib/firebase";

// core patient profile
import { patientService } from "../../../services/patientService";

// domain services (strict, Firestore-backed)
import { conditionsService } from "../../conditions/services/conditionService";
import { medicationsService } from "../../medications/services/medicationsService";
import { allergiesService } from "../../allergies/services/allergiesService";
import { surgeriesService } from "../../surgeries/services/surgeriesService";
import { familyHistoryService } from "../../familyHistory/services/familyHistoryService";
import { socialHistoryService } from "../../socialHistory/services/socialHistoryService";
import { hpiService } from "../../hpi/services/hpiService";

// ---------------------------------------------------------
// ZOD SCHEMAS – STRICT, FHIR-FRIENDLY
// ---------------------------------------------------------

const zDemographics = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  dob: z.string().optional(), // YYYY-MM-DD
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
});

const zCondition = z.object({
  name: z.string(),
  status: z.string().optional(),       // active / resolved / etc
  onsetDate: z.string().optional(),    // YYYY-MM-DD
  description: z.string().optional(),
  notes: z.string().optional(),
});

const zMedication = z.object({
  name: z.string(),
  genericName: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  route: z.string().optional(),
  reason: z.string().optional(),
  issues: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  notes: z.string().optional(),
});

const zAllergy = z.object({
  substance: z.string(),
  reaction: z.string().optional(),
  severity: z.enum(["mild", "moderate", "severe"]).optional(),
  notes: z.string().optional(),
  year: z.string().optional(),
});

const zSurgery = z.object({
  // IMPORTANT: use `procedure` (not `name`) – matches SurgeryInput
  procedure: z.string(),
  year: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const zFamilyHistory = z.object({
  relation: z.string(),         // mother, father, sibling, etc.
  condition: z.string(),        // "Type 2 Diabetes"
  diagnosedAge: z.number().optional(),
  notes: z.string().optional(),
});

const zSocialHistory = z.object({
  smoking: z.string().optional(),
  alcohol: z.string().optional(),
  drugs: z.string().optional(),
  exercise: z.string().optional(),
  occupation: z.string().optional(),
  livingSituation: z.string().optional(),
  diet: z.string().optional(),
});

const zHpiEntry = z.object({
  chiefComplaint: z.string(),
  onset: z.string().optional(),
  duration: z.string().optional(),
  severity: z.string().optional(),
  progression: z.string().optional(),
  modifyingFactors: z.string().optional(),
  associatedSymptoms: z.array(z.string()).optional(),
  context: z.string().optional(),
  notes: z.string().optional(),
});

// MASTER PAYLOAD
export const onboardingInputSchema = z.object({
  demographics: zDemographics.optional(),
  pmh: z.array(zCondition).optional(),          // Past Medical History
  medications: z.array(zMedication).optional(),
  allergies: z.array(zAllergy).optional(),
  surgeries: z.array(zSurgery).optional(),
  familyHistory: z.array(zFamilyHistory).optional(),
  socialHistory: zSocialHistory.optional(),
  hpi: z.array(zHpiEntry).optional(),
});

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;

// ---------------------------------------------------------
// ONBOARDING PIPELINE – AI → Firestore
// ---------------------------------------------------------

export const onboardingPipeline = {
  /**
   * Run the full onboarding import.
   * Call this from your AI service with the raw AI-parsed JSON.
   */
  async run(rawInput: unknown) {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      throw new Error("User is not authenticated");
    }

    // 1) Validate & normalize AI payload
    const parsed = onboardingInputSchema.safeParse(rawInput);
    if (!parsed.success) {
      console.error("Onboarding validation error:", parsed.error);
      throw new Error("Invalid onboarding payload: " + parsed.error.message);
    }

    const input = parsed.data;

    // 2) DEMOGRAPHICS → patientService
    if (input.demographics) {
      await patientService.updatePatientProfile(input.demographics);
    }

    // 3) CONDITIONS (PMH)
    if (input.pmh && input.pmh.length > 0) {
      for (const c of input.pmh) {
        // cast to the service's expected input type if needed
        await conditionsService.addCondition(c as any);
      }
    }

    // 4) MEDICATIONS
    if (input.medications && input.medications.length > 0) {
      for (const m of input.medications) {
        await medicationsService.addMedication(m as any);
      }
    }

    // 5) ALLERGIES
    if (input.allergies && input.allergies.length > 0) {
      for (const a of input.allergies) {
        await allergiesService.addAllergy(a as any);
      }
    }

    // 6) SURGERIES (PSH)
    if (input.surgeries && input.surgeries.length > 0) {
      for (const s of input.surgeries) {
        // NOTE: strictly uses `procedure`, matching SurgeryInput
        await surgeriesService.addSurgery(s as any);
      }
    }

    // 7) FAMILY HISTORY
    if (input.familyHistory && input.familyHistory.length > 0) {
      for (const f of input.familyHistory) {
        await familyHistoryService.addFamilyHistory(f as any);
      }
    }

    // 8) SOCIAL HISTORY
    if (input.socialHistory) {
      await socialHistoryService.updateSocialHistory(input.socialHistory as any);
    }

    // 9) HPI
    if (input.hpi && input.hpi.length > 0) {
      for (const h of input.hpi) {
        await hpiService.addHPI(h as any);
      }
    }

    return {
      success: true,
      imported: {
        demographics: !!input.demographics,
        pmh: input.pmh?.length ?? 0,
        medications: input.medications?.length ?? 0,
        allergies: input.allergies?.length ?? 0,
        surgeries: input.surgeries?.length ?? 0,
        familyHistory: input.familyHistory?.length ?? 0,
        socialHistory: !!input.socialHistory,
        hpi: input.hpi?.length ?? 0,
      },
    };
  },
};
