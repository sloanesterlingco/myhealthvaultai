// src/features/medications/services/medicationRules.ts

import {
  LabRule,
  MedicationRule,
  MedicationClass,
  VitalRule,
} from "./types";

const bpVitalRulesForHypertensives: VitalRule[] = [
  {
    type: "systolic_bp",
    lowWarning: 100,
    lowDanger: 90,
    rationale: "Low blood pressure on this medication can increase risk of dizziness, falls, or fainting.",
  },
  {
    type: "heart_rate",
    lowWarning: 55,
    lowDanger: 50,
    rationale: "Low heart rate on this medication can increase risk of bradycardia and syncope.",
  },
];

const aceiLabRules: LabRule[] = [
  {
    type: "potassium",
    highWarning: 5.0,
    highDanger: 5.5,
    rationale: "Elevated potassium on ACE inhibitor increases risk of cardiac arrhythmia.",
  },
  {
    type: "creatinine",
    highWarning: 1.5,
    highDanger: 2.0,
    rationale: "Rising creatinine on ACE inhibitor may indicate kidney stress or acute kidney injury.",
  },
];

const nsaidLabRules: LabRule[] = [
  {
    type: "creatinine",
    highWarning: 1.3,
    highDanger: 1.8,
    rationale: "Rising creatinine on NSAID may indicate kidney injury, especially in CKD or volume depletion.",
  },
];

const anticoagulantLabRules: LabRule[] = [
  {
    type: "inr",
    highWarning: 3.0,
    highDanger: 4.0,
    rationale: "Elevated INR on anticoagulant increases risk of bleeding.",
  },
  {
    type: "hemoglobin",
    lowWarning: 11.0,
    lowDanger: 9.0,
    rationale: "Dropping hemoglobin on anticoagulant may signal occult bleeding.",
  },
];

export const medicationRules: MedicationRule[] = [
  {
    genericName: "lisinopril",
    displayName: "Lisinopril",
    classes: ["ACE_INHIBITOR", "OTHER"],
    usualAdultDoseRangeMgPerDay: {
      min: 5,
      max: 40,
      note: "Typical dose range; depends on indication and renal function.",
    },
    monitoring: {
      vitals: bpVitalRulesForHypertensives,
      labs: aceiLabRules,
    },
    contraindications: [
      {
        condition: "pregnancy",
        description: "ACE inhibitors are contraindicated in pregnancy.",
        severity: "red",
      },
      {
        condition: "history_of_angioedema",
        description: "History of ACE inhibitor–induced angioedema is a strong contraindication.",
        severity: "red",
      },
    ],
    notes: "Monitor BP, renal function, and potassium, especially after dose changes.",
  },
  {
    genericName: "metoprolol",
    displayName: "Metoprolol",
    classes: ["BETA_BLOCKER"],
    usualAdultDoseRangeMgPerDay: {
      min: 25,
      max: 400,
      note: "Dose depends on formulation and indication.",
    },
    monitoring: {
      vitals: bpVitalRulesForHypertensives,
    },
    notes: "Watch for bradycardia and hypotension; taper rather than abrupt stop when possible.",
  },
  {
    genericName: "ibuprofen",
    displayName: "Ibuprofen",
    classes: ["NSAID"],
    usualAdultDoseRangeMgPerDay: {
      max: 2400,
      note: "Short-term use recommended at lowest effective dose.",
    },
    monitoring: {
      labs: nsaidLabRules,
    },
    contraindications: [
      {
        condition: "advanced_ckd",
        description: "NSAIDs can worsen kidney function in advanced chronic kidney disease.",
        severity: "yellow",
      },
      {
        condition: "history_of_gi_bleed",
        description: "NSAIDs increase risk of recurrent GI bleeding.",
        severity: "yellow",
      },
    ],
    notes: "Use cautiously in CKD, heart failure, or with ACEi/ARB + diuretic.",
  },
  {
    genericName: "apixaban",
    displayName: "Apixaban",
    classes: ["ANTICOAGULANT"],
    monitoring: {
      labs: anticoagulantLabRules,
    },
    contraindications: [
      {
        condition: "active_bleeding",
        description: "Active bleeding is a strong contraindication to anticoagulant therapy.",
        severity: "red",
      },
      {
        condition: "severe_hepatic_impairment",
        description: "Severe liver disease may increase exposure and bleeding risk.",
        severity: "yellow",
      },
    ],
    notes: "Assess bleeding risk regularly and review for drug–drug interactions.",
  },
  {
    genericName: "sertraline",
    displayName: "Sertraline",
    classes: ["SSRI"],
    notes: "Monitor for mood changes, GI side effects, sexual side effects; consider sodium in older adults or those at risk of hyponatremia.",
  },
];

// Convenience map: genericName (lowercased) -> rule
export const medicationRulesByGeneric: Record<string, MedicationRule> =
  medicationRules.reduce((acc, rule) => {
    acc[rule.genericName.toLowerCase()] = rule;
    return acc;
  }, {} as Record<string, MedicationRule>);
