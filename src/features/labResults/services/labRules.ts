// src/features/labResults/services/labRules.ts

/**
 * LAB RULES / NORMAL RANGES
 * -------------------------
 * Central reference for:
 *  - Canonical lab codes (HGB, WBC, NA, etc.)
 *  - Display names + category
 *  - Units
 *  - Adult male / female / any normal ranges
 *  - Optional "critical" / panic thresholds
 *
 * NOTE:
 *  - These ranges are GENERAL ADULT ranges and may vary by lab.
 *  - Always treat them as guidance, not absolute diagnostic cutoffs.
 *  - We can extend with age-specific / pediatric rules later.
 */

export type SexAtBirth = "male" | "female" | "other" | "unknown";

export interface LabNumericRange {
  min: number;
  max: number;
}

export interface LabNormalRanges {
  /** Applies to all sexes if present */
  any?: LabNumericRange;
  /** Male-specific range */
  male?: LabNumericRange;
  /** Female-specific range */
  female?: LabNumericRange;
}

export interface LabCriticalThresholds {
  low?: number;
  high?: number;
}

/**
 * Core rule object for a single test
 */
export interface LabRule {
  /** Canonical internal code, e.g. "HGB", "NA", "A1C" */
  code: string;
  /** Human-friendly name, e.g. "Hemoglobin" */
  name: string;
  /** Panel category: CBC, CMP, LIPIDS, ENDOCRINE, etc. */
  category:
    | "CBC"
    | "CMP"
    | "LIPIDS"
    | "ENDOCRINE"
    | "RENAL"
    | "HEPATIC"
    | "DIABETES"
    | "OTHER";
  /** Display units, e.g. "g/dL" */
  unit: string;
  /** Normal ranges for adults */
  normalRange: LabNormalRanges;
  /** Optional critical / panic thresholds */
  critical?: LabCriticalThresholds;
  /** Optional brief clinical note (for AI / UI hints) */
  note?: string;
  /** Common aliases from lab reports (for matching) */
  aliases?: string[];
}

/**
 * Handy helper: build a range quickly
 */
const r = (min: number, max: number): LabNumericRange => ({ min, max });

/**
 * MASTER LAB RULE MAP
 * -------------------
 * Keyed by canonical code. We can also look up by alias/name via helper below.
 *
 * These are intentionally simple adult ranges. We'll refine later with:
 *  - age bands
 *  - pregnancy-specific ranges
 *  - pediatric ranges
 */
export const LAB_RULES: Record<string, LabRule> = {
  // --------------------
  // CBC (Complete Blood Count)
  // --------------------
  HGB: {
    code: "HGB",
    name: "Hemoglobin",
    category: "CBC",
    unit: "g/dL",
    normalRange: {
      male: r(13.5, 17.5),
      female: r(12.0, 15.5),
    },
    critical: {
      low: 7,
      high: 22,
    },
    note: "Low Hgb suggests anemia or blood loss; very low values are high risk.",
    aliases: ["HGB", "Hemoglobin", "Hb", "Hgb"],
  },

  HCT: {
    code: "HCT",
    name: "Hematocrit",
    category: "CBC",
    unit: "%",
    normalRange: {
      male: r(41, 53),
      female: r(36, 46),
    },
    note: "Percentage of blood volume occupied by red blood cells.",
    aliases: ["HCT", "Hematocrit"],
  },

  WBC: {
    code: "WBC",
    name: "White Blood Cell Count",
    category: "CBC",
    unit: "10^3/µL",
    normalRange: {
      any: r(4.0, 11.0),
    },
    critical: {
      low: 1.0,
      high: 30.0,
    },
    note: "Elevated WBC suggests infection/inflammation; very low may mean marrow suppression.",
    aliases: ["WBC", "White Blood Cells"],
  },

  PLT: {
    code: "PLT",
    name: "Platelets",
    category: "CBC",
    unit: "10^3/µL",
    normalRange: {
      any: r(150, 400),
    },
    critical: {
      low: 20,
      high: 1000,
    },
    note: "Low platelets increase bleeding risk; very high may increase clotting risk.",
    aliases: ["PLT", "Platelet Count"],
  },

  RBC: {
    code: "RBC",
    name: "Red Blood Cell Count",
    category: "CBC",
    unit: "10^6/µL",
    normalRange: {
      male: r(4.5, 5.9),
      female: r(4.1, 5.1),
    },
    aliases: ["RBC", "Red Blood Cells"],
  },

  MCV: {
    code: "MCV",
    name: "Mean Corpuscular Volume",
    category: "CBC",
    unit: "fL",
    normalRange: {
      any: r(80, 100),
    },
    note: "Low MCV suggests microcytic anemia; high suggests macrocytic.",
    aliases: ["MCV"],
  },

  // --------------------
  // CMP / Electrolytes / Renal
  // --------------------
  NA: {
    code: "NA",
    name: "Sodium",
    category: "CMP",
    unit: "mmol/L",
    normalRange: {
      any: r(135, 145),
    },
    critical: {
      low: 120,
      high: 160,
    },
    note: "Abnormal sodium can cause confusion, seizures and neurologic symptoms.",
    aliases: ["Na", "Sodium", "Na+"],
  },

  K: {
    code: "K",
    name: "Potassium",
    category: "CMP",
    unit: "mmol/L",
    normalRange: {
      any: r(3.5, 5.1),
    },
    critical: {
      low: 2.5,
      high: 6.5,
    },
    note: "High or low potassium can cause dangerous heart rhythm problems.",
    aliases: ["K", "Potassium", "K+"],
  },

  CL: {
    code: "CL",
    name: "Chloride",
    category: "CMP",
    unit: "mmol/L",
    normalRange: {
      any: r(98, 107),
    },
    aliases: ["Cl", "Chloride"],
  },

  CO2: {
    code: "CO2",
    name: "CO2 / Bicarbonate",
    category: "CMP",
    unit: "mmol/L",
    normalRange: {
      any: r(22, 29),
    },
    aliases: ["CO2", "Bicarb", "HCO3"],
  },

  BUN: {
    code: "BUN",
    name: "Blood Urea Nitrogen",
    category: "RENAL",
    unit: "mg/dL",
    normalRange: {
      any: r(7, 20),
    },
    aliases: ["BUN", "Urea Nitrogen"],
  },

  CREAT: {
    code: "CREAT",
    name: "Creatinine",
    category: "RENAL",
    unit: "mg/dL",
    normalRange: {
      any: r(0.6, 1.3),
    },
    note: "Used to estimate kidney function (eGFR).",
    aliases: ["Creatinine", "CREAT", "Cr"],
  },

  GLUCOSE: {
    code: "GLUCOSE",
    name: "Glucose (fasting)",
    category: "CMP",
    unit: "mg/dL",
    normalRange: {
      any: r(70, 99),
    },
    note: "Fasting glucose 100–125 is impaired; ≥126 on two tests suggests diabetes.",
    aliases: ["Glucose", "Fasting Glucose", "GLU"],
  },

  CALCIUM: {
    code: "CALCIUM",
    name: "Calcium",
    category: "CMP",
    unit: "mg/dL",
    normalRange: {
      any: r(8.5, 10.5),
    },
    critical: {
      low: 6.5,
      high: 13,
    },
    aliases: ["Calcium", "Ca"],
  },

  // --------------------
  // Liver / Hepatic
  // --------------------
  AST: {
    code: "AST",
    name: "AST",
    category: "HEPATIC",
    unit: "U/L",
    normalRange: {
      any: r(10, 40),
    },
    note: "Liver enzyme; elevated in liver injury, muscle injury and other conditions.",
    aliases: ["AST", "SGOT"],
  },

  ALT: {
    code: "ALT",
    name: "ALT",
    category: "HEPATIC",
    unit: "U/L",
    normalRange: {
      any: r(7, 56),
    },
    note: "Liver enzyme; often more specific to the liver than AST.",
    aliases: ["ALT", "SGPT"],
  },

  ALP: {
    code: "ALP",
    name: "Alkaline Phosphatase",
    category: "HEPATIC",
    unit: "U/L",
    normalRange: {
      any: r(44, 147),
    },
    aliases: ["ALP", "Alkaline Phosphatase"],
  },

  BILI_TOTAL: {
    code: "BILI_TOTAL",
    name: "Total Bilirubin",
    category: "HEPATIC",
    unit: "mg/dL",
    normalRange: {
      any: r(0.1, 1.2),
    },
    aliases: ["Total Bilirubin", "Bilirubin, Total", "TBili"],
  },

  ALBUMIN: {
    code: "ALBUMIN",
    name: "Albumin",
    category: "HEPATIC",
    unit: "g/dL",
    normalRange: {
      any: r(3.5, 5.0),
    },
    aliases: ["Albumin"],
  },

  // --------------------
  // Lipids
  // --------------------
  CHOL_TOTAL: {
    code: "CHOL_TOTAL",
    name: "Total Cholesterol",
    category: "LIPIDS",
    unit: "mg/dL",
    normalRange: {
      any: r(0, 199),
    },
    note: "<200 desirable; 200–239 borderline high; ≥240 high.",
    aliases: ["Cholesterol", "Total Cholesterol"],
  },

  HDL: {
    code: "HDL",
    name: "HDL Cholesterol",
    category: "LIPIDS",
    unit: "mg/dL",
    normalRange: {
      any: r(40, 999),
    },
    note: "Higher HDL is generally protective; <40 considered low in many guidelines.",
    aliases: ["HDL"],
  },

  LDL: {
    code: "LDL",
    name: "LDL Cholesterol (calculated)",
    category: "LIPIDS",
    unit: "mg/dL",
    normalRange: {
      any: r(0, 129),
    },
    note: "<100 optimal for many patients; lower targets for high-risk patients.",
    aliases: ["LDL", "LDL-C"],
  },

  TRIGLY: {
    code: "TRIGLY",
    name: "Triglycerides",
    category: "LIPIDS",
    unit: "mg/dL",
    normalRange: {
      any: r(0, 149),
    },
    note: "<150 normal; 150–199 borderline high; ≥200 high.",
    aliases: ["Triglycerides", "TG"],
  },

  // --------------------
  // Diabetes / Endocrine
  // --------------------
  A1C: {
    code: "A1C",
    name: "Hemoglobin A1c",
    category: "DIABETES",
    unit: "%",
    normalRange: {
      any: r(4.0, 5.6),
    },
    note: "5.7–6.4% prediabetes; ≥6.5% on two tests suggests diabetes.",
    aliases: ["HbA1c", "A1C", "Hemoglobin A1c"],
  },

  TSH: {
    code: "TSH",
    name: "TSH",
    category: "ENDOCRINE",
    unit: "µIU/mL",
    normalRange: {
      any: r(0.4, 4.5),
    },
    note: "High TSH suggests hypothyroidism; low TSH suggests hyperthyroidism.",
    aliases: ["TSH", "Thyroid Stimulating Hormone"],
  },

  FREE_T4: {
    code: "FREE_T4",
    name: "Free T4",
    category: "ENDOCRINE",
    unit: "ng/dL",
    normalRange: {
      any: r(0.8, 1.8),
    },
    aliases: ["Free T4", "FT4"],
  },
};

/**
 * Try to resolve a test by:
 *  - canonical code (e.g. "HGB")
 *  - alias (e.g. "Hemoglobin", "Hgb", case-insensitive)
 */
export const findLabRule = (codeOrName: string): LabRule | undefined => {
  if (!codeOrName) return undefined;
  const needle = codeOrName.trim().toLowerCase();

  // Direct key match
  const direct = LAB_RULES[codeOrName.toUpperCase()];
  if (direct) return direct;

  // Alias / name scan
  const all = Object.values(LAB_RULES);
  return all.find((rule) => {
    if (rule.name.toLowerCase() === needle) return true;
    if (!rule.aliases) return false;
    return rule.aliases.some((a) => a.toLowerCase() === needle);
  });
};

/**
 * Select which normal range to use based on sex.
 * If sex-specific range is missing, falls back to `any`.
 */
export const getNormalRangeForSex = (
  rule: LabRule,
  sex: SexAtBirth | undefined
): LabNumericRange | undefined => {
  const { normalRange } = rule;
  if (!normalRange) return undefined;

  if (sex === "male" && normalRange.male) return normalRange.male;
  if (sex === "female" && normalRange.female) return normalRange.female;

  // fallback
  return normalRange.any || normalRange.male || normalRange.female;
};

/**
 * Basic classification of a single numeric lab value
 * (we'll build the full Risk Engine on top of this later).
 */
export type LabFlag =
  | "low"
  | "normal"
  | "high"
  | "critical_low"
  | "critical_high"
  | "unknown";

export interface LabEvaluation {
  flag: LabFlag;
  /**
   * Numeric position vs chosen range:
   *  - negative: below normal
   *  - zero: in range
   *  - positive: above normal
   */
  offset?: number;
  usedRange?: LabNumericRange;
}

/**
 * Evaluate a lab value using the rule + sex-based range.
 */
export const evaluateLabValue = (
  rule: LabRule,
  value: number,
  sex?: SexAtBirth
): LabEvaluation => {
  if (value == null || Number.isNaN(value)) {
    return { flag: "unknown" };
  }

  const range = getNormalRangeForSex(rule, sex);
  if (!range) {
    return { flag: "unknown" };
  }

  const { min, max } = range;
  const critical = rule.critical;

  // Check criticals first if present
  if (critical?.low != null && value <= critical.low) {
    return { flag: "critical_low", usedRange: range, offset: value - min };
  }
  if (critical?.high != null && value >= critical.high) {
    return { flag: "critical_high", usedRange: range, offset: value - max };
  }

  if (value < min) {
    return { flag: "low", usedRange: range, offset: value - min };
  }
  if (value > max) {
    return { flag: "high", usedRange: range, offset: value - max };
  }

  return { flag: "normal", usedRange: range, offset: 0 };
};
