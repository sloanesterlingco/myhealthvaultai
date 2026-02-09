// src/features/hpi/utils/hpiFlowConfig.ts

export type HPISectionKey =
  | "chiefComplaint"
  | "onset"
  | "duration"
  | "progression"
  | "associatedSymptoms"
  | "severity"
  | "impactOnLife"
  | "treatmentsTried";

/**
 * Adaptive rules for which sections to show based on the complaint.
 * 
 * IMPORTANT:
 * - This is simple and rule-based (fast, controllable).
 * - Later we can add AI-enhanced mappings for nuance.
 */
export const HPI_FLOW_CONFIG: Record<
  string,
  {
    keywords: string[];
    sections: HPISectionKey[];
  }
> = {
  // GENERAL RESPIRATORY
  cough: {
    keywords: ["cough", "cold", "fever", "runny nose", "congestion"],
    sections: [
      "chiefComplaint",
      "onset",
      "duration",
      "progression",
      "associatedSymptoms",
      "severity",
      "impactOnLife",
      "treatmentsTried",
    ],
  },

  // PEDIATRIC COMMON COMPLAINT
  fever: {
    keywords: ["fever", "chills", "temperature", "sick", "infection"],
    sections: [
      "chiefComplaint",
      "onset",
      "duration",
      "progression",
      "associatedSymptoms",
      "severity",
      "impactOnLife",
      "treatmentsTried",
    ],
  },

  // MUSCULOSKELETAL
  pain: {
    keywords: ["pain", "aching", "sore", "injury"],
    sections: [
      "chiefComplaint",
      "onset",
      "duration",
      "severity",
      "progression",
      "impactOnLife",
      "treatmentsTried",
    ],
  },

  // VASCULAR
  claudication: {
    keywords: ["leg pain walking", "calf pain", "claudication", "PAD"],
    sections: [
      "chiefComplaint",
      "onset",
      "duration",
      "progression",
      "severity",
      "impactOnLife",
      "associatedSymptoms",
      "treatmentsTried",
    ],
  },

  // DEFAULT CATCH-ALL
  default: {
    keywords: [],
    sections: [
      "chiefComplaint",
      "onset",
      "duration",
      "progression",
      "associatedSymptoms",
      "severity",
      "impactOnLife",
      "treatmentsTried",
    ],
  },
};
