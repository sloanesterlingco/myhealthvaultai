// src/features/medications/services/interactionRules.ts

import {
  MedicationInteractionRule,
} from "./types";

/**
 * Core interaction rules. These are class-based so they work across many drugs.
 * You can expand this list over time.
 */
export const medicationInteractionRules: MedicationInteractionRule[] = [
  {
    id: "acei_nsaid_kidney",
    label: "ACE inhibitor + NSAID",
    severity: "major",
    agents: [
      { medicationClass: "ACE_INHIBITOR" },
      { medicationClass: "NSAID" },
    ],
    summary: "ACE inhibitor plus NSAID increases risk of kidney injury and high potassium.",
    details:
      "ACE inhibitors dilate efferent arterioles and NSAIDs constrict afferent arterioles in the kidney. Together they can significantly reduce glomerular filtration, especially in volume depletion or CKD.",
    monitoring: [
      "Kidney function (creatinine, eGFR)",
      "Serum potassium",
      "Blood pressure",
      "Monitor for decreased urine output or swelling",
    ],
  },
  {
    id: "arb_nsaid_kidney",
    label: "ARB + NSAID",
    severity: "major",
    agents: [
      { medicationClass: "ARB" },
      { medicationClass: "NSAID" },
    ],
    summary: "ARB plus NSAID increases risk of kidney injury and high potassium.",
    details:
      "ARB medications and NSAIDs both reduce renal perfusion. In combination they may cause acute kidney injury, particularly in older adults or those with CKD.",
    monitoring: [
      "Kidney function (creatinine, eGFR)",
      "Serum potassium",
      "Blood pressure",
      "Monitor for decreased urine output or swelling",
    ],
  },
  {
    id: "anticoagulant_nsaid_bleeding",
    label: "Anticoagulant + NSAID",
    severity: "major",
    agents: [
      { medicationClass: "ANTICOAGULANT" },
      { medicationClass: "NSAID" },
    ],
    summary: "Anticoagulant plus NSAID significantly increases bleeding risk.",
    details:
      "NSAIDs impair platelet function and can cause GI mucosal injury. Combined with anticoagulants this can markedly raise the risk of GI and other bleeding.",
    monitoring: [
      "Signs of bleeding (bruising, dark stools, nosebleeds)",
      "Hemoglobin / hematocrit as clinically indicated",
      "Avoid additional OTC NSAIDs without medical advice",
    ],
  },
  {
    id: "anticoagulant_antiplatelet_bleeding",
    label: "Anticoagulant + Antiplatelet",
    severity: "major",
    agents: [
      { medicationClass: "ANTICOAGULANT" },
      { medicationClass: "ANTIPLATELET" },
    ],
    summary: "Anticoagulant plus antiplatelet therapy increases major bleeding risk.",
    details:
      "Dual pathway inhibition of coagulation and platelet aggregation reduces thrombosis risk but increases the chance of serious bleeding; usually reserved for specific indications and durations.",
    monitoring: [
      "Bleeding signs (gum bleeding, bruising, dark or bloody stools)",
      "Hemoglobin / hematocrit",
      "Medication review with cardiology / primary team",
    ],
  },
  {
    id: "ssri_nsaid_gi_bleed",
    label: "SSRI + NSAID",
    severity: "moderate",
    agents: [
      { medicationClass: "SSRI" },
      { medicationClass: "NSAID" },
    ],
    summary: "SSRI plus NSAID increases risk of GI bleeding.",
    details:
      "SSRIs can impair platelet serotonin uptake and reduce aggregation; NSAIDs injure GI mucosa. Together they modestly increase upper GI bleed risk, especially in older adults or those with prior ulcers.",
    monitoring: [
      "Watch for black or bloody stools",
      "Consider gastroprotection if long-term combination is needed",
      "Avoid additional OTC NSAIDs when possible",
    ],
  },
];
