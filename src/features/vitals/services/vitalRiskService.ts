// src/features/vitals/services/vitalRiskService.ts

import {
  PatientVitalsRiskSummary,
  VitalRecord,
  VitalRiskAssessment,
  RiskLevel,
  VitalType,
} from "../types";

// Severity ranking used to compute overall level
const severityRank: Record<RiskLevel, number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

const clampScore = (score: number): number => Math.max(0, Math.min(100, score));

// -----------------------------------------------------
// Per-vital assessment helpers
// -----------------------------------------------------

function assessHeartRate(record: VitalRecord): VitalRiskAssessment {
  const hr = record.value ?? null;

  if (hr == null) {
    return {
      type: "hr",
      level: "green",
      label: "No data",
      message: "No recent heart rate data available to assess risk.",
      numericScore: 0,
    };
  }

  // Adult resting HR
  if (hr < 50 || hr > 120) {
    return {
      type: "hr",
      level: "red",
      label: "Abnormal heart rate",
      message: `Heart rate of ${hr} bpm is outside the typical safe resting range.`,
      numericScore: 90,
      recommendAction:
        "Confirm with manual pulse or device, review medications and symptoms, and consider urgent evaluation if symptomatic.",
    };
  }

  if ((hr >= 50 && hr < 60) || (hr > 100 && hr <= 120)) {
    return {
      type: "hr",
      level: "yellow",
      label: "Borderline heart rate",
      message: `Heart rate of ${hr} bpm is slightly outside the usual 60–100 bpm range.`,
      numericScore: 60,
      recommendAction:
        "Recheck at rest, review caffeine/stimulant use, hydration, and recent activity.",
    };
  }

  return {
    type: "hr",
    level: "green",
    label: "Normal heart rate",
    message: `Heart rate of ${hr} bpm is within the typical resting range for most adults.`,
    numericScore: 10,
  };
}

function assessSpO2(record: VitalRecord): VitalRiskAssessment {
  const spo2 = record.value ?? null;

  if (spo2 == null) {
    return {
      type: "spo2",
      level: "green",
      label: "No data",
      message: "No recent oxygen saturation data available to assess risk.",
      numericScore: 0,
    };
  }

  if (spo2 < 90) {
    return {
      type: "spo2",
      level: "red",
      label: "Low oxygen saturation",
      message: `SpO₂ of ${spo2}% is concerning for hypoxemia.`,
      numericScore: 95,
      recommendAction:
        "If confirmed and the patient is symptomatic (shortness of breath, chest pain, confusion), this may warrant urgent/emergency evaluation.",
    };
  }

  if (spo2 >= 90 && spo2 < 94) {
    return {
      type: "spo2",
      level: "yellow",
      label: "Borderline oxygen saturation",
      message: `SpO₂ of ${spo2}% is slightly below the usual ≥94% range.`,
      numericScore: 60,
      recommendAction:
        "Recheck with a reliable device, review chronic lung or heart disease, and correlate with symptoms.",
    };
  }

  return {
    type: "spo2",
    level: "green",
    label: "Normal oxygen saturation",
    message: `SpO₂ of ${spo2}% is within the typical healthy range (≥94%).`,
    numericScore: 10,
  };
}

function assessBloodPressure(record: VitalRecord): VitalRiskAssessment {
  const sys = record.systolic ?? null;
  const dia = record.diastolic ?? null;

  if (sys == null || dia == null) {
    return {
      type: "bp",
      level: "green",
      label: "No data",
      message: "No recent blood pressure reading is available to assess risk.",
      numericScore: 0,
    };
  }

  // Based loosely on ACC/AHA categories
  if (sys >= 180 || dia >= 120) {
    return {
      type: "bp",
      level: "red",
      label: "Hypertensive crisis range",
      message: `Blood pressure ${sys}/${dia} mmHg is in a range that can be dangerous.`,
      numericScore: 98,
      recommendAction:
        "Verify reading. If confirmed and patient has concerning symptoms (chest pain, shortness of breath, neurologic deficits), this should be treated as an emergency.",
    };
  }

  if (sys >= 140 || dia >= 90) {
    return {
      type: "bp",
      level: "red",
      label: "High blood pressure",
      message: `Blood pressure ${sys}/${dia} mmHg is in the high (stage 2) range.`,
      numericScore: 90,
      recommendAction:
        "Review home BP log, meds, and risk factors. Consider timely clinical follow-up for adjustment of therapy.",
    };
  }

  if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
    return {
      type: "bp",
      level: "yellow",
      label: "Elevated blood pressure",
      message: `Blood pressure ${sys}/${dia} mmHg is above the ideal <120/<80 range.`,
      numericScore: 65,
      recommendAction:
        "Encourage home monitoring, lifestyle changes (sodium, exercise, weight), and follow-up for trend review.",
    };
  }

  if (sys >= 120 && sys <= 129 && dia < 80) {
    return {
      type: "bp",
      level: "yellow",
      label: "Elevated systolic pressure",
      message: `Systolic pressure of ${sys} mmHg is mildly elevated though diastolic is <80.`,
      numericScore: 50,
      recommendAction:
        "Track BP over time and review lifestyle factors; may represent early hypertension.",
    };
  }

  if (sys < 90 || dia < 60) {
    return {
      type: "bp",
      level: "yellow",
      label: "Low blood pressure",
      message: `Blood pressure ${sys}/${dia} mmHg is below the usual 90/60 threshold.`,
      numericScore: 55,
      recommendAction:
        "Correlate with symptoms (dizziness, syncope). Consider volume status, medications, and recent illness.",
    };
  }

  return {
    type: "bp",
    level: "green",
    label: "Normal blood pressure",
    message: `Blood pressure ${sys}/${dia} mmHg is within the standard normal range (<120/<80).`,
    numericScore: 10,
  };
}

function assessRespiratoryRate(record: VitalRecord): VitalRiskAssessment {
  const rr = record.value ?? null;

  if (rr == null) {
    return {
      type: "rr",
      level: "green",
      label: "No data",
      message: "No recent respiratory rate data available to assess risk.",
      numericScore: 0,
    };
  }

  // Adult RR
  if (rr < 10 || rr > 24) {
    return {
      type: "rr",
      level: "red",
      label: "Abnormal respiratory rate",
      message: `Respiratory rate of ${rr} breaths/min is outside the typical 12–20 range.`,
      numericScore: 90,
      recommendAction:
        "If confirmed, correlate with SpO₂ and clinical symptoms; may indicate respiratory distress or metabolic abnormality.",
    };
  }

  if (rr >= 21 && rr <= 24) {
    return {
      type: "rr",
      level: "yellow",
      label: "Borderline respiratory rate",
      message: `Respiratory rate of ${rr} breaths/min is slightly elevated above 20.`,
      numericScore: 60,
      recommendAction:
        "Reassess at rest and review for pain, anxiety, fever, or respiratory conditions.",
    };
  }

  return {
    type: "rr",
    level: "green",
    label: "Normal respiratory rate",
    message: `Respiratory rate of ${rr} breaths/min is within the typical 12–20 range.`,
    numericScore: 10,
  };
}

function assessTemperature(record: VitalRecord): VitalRiskAssessment {
  const temp = record.value ?? null;

  if (temp == null) {
    return {
      type: "temp",
      level: "green",
      label: "No data",
      message: "No recent temperature data available to assess risk.",
      numericScore: 0,
    };
  }

  // Fahrenheit thresholds
  if (temp >= 104 || temp < 95) {
    return {
      type: "temp",
      level: "red",
      label: "Marked temperature abnormality",
      message: `Temperature of ${temp.toFixed(1)}°F is concerning (high fever or hypothermia range).`,
      numericScore: 95,
      recommendAction:
        "Cross-check with another thermometer and correlate with systemic symptoms; may warrant urgent evaluation.",
    };
  }

  if (temp >= 100.4 && temp < 104) {
    return {
      type: "temp",
      level: "yellow",
      label: "Fever range",
      message: `Temperature of ${temp.toFixed(1)}°F is consistent with fever.`,
      numericScore: 65,
      recommendAction:
        "Monitor symptoms, hydration, and response to antipyretics; consider clinical follow-up depending on context.",
    };
  }

  if (temp >= 97 && temp <= 99.5) {
    return {
      type: "temp",
      level: "green",
      label: "Normal temperature",
      message: `Temperature of ${temp.toFixed(1)}°F is within the typical range.`,
      numericScore: 10,
    };
  }

  return {
    type: "temp",
    level: "green",
    label: "Borderline but likely normal",
    message: `Temperature of ${temp.toFixed(1)}°F is slightly outside the classic range but may still be normal depending on context and measurement site.`,
    numericScore: 20,
  };
}

function assessWeight(record: VitalRecord): VitalRiskAssessment {
  const weight = record.value ?? null;

  if (weight == null) {
    return {
      type: "weight",
      level: "green",
      label: "No data",
      message: "No recent weight data available to assess trend or risk.",
      numericScore: 0,
    };
  }

  return {
    type: "weight",
    level: "green",
    label: "Weight recorded",
    message:
      "A single weight value is recorded. Risk depends on long-term trends and BMI, which are not evaluated here yet.",
    numericScore: 15,
  };
}

// -----------------------------------------------------
// Main service
// -----------------------------------------------------

function getAssessor(type: VitalType): (record: VitalRecord) => VitalRiskAssessment {
  switch (type) {
    case "hr":
      return assessHeartRate;
    case "bp":
      return assessBloodPressure;
    case "spo2":
      return assessSpO2;
    case "rr":
      return assessRespiratoryRate;
    case "temp":
      return assessTemperature;
    case "weight":
      return assessWeight;
    default:
      return (record: VitalRecord) => ({
        type: record.type,
        level: "green",
        label: "No rules defined",
        message: "No specific risk rules are defined for this vital type yet.",
        numericScore: 0,
      });
  }
}

export const vitalRiskService = {
  assessVital(record: VitalRecord): VitalRiskAssessment {
    const assessor = getAssessor(record.type);
    const result = assessor(record);
    return {
      ...result,
      numericScore: clampScore(result.numericScore ?? 0),
    };
  },

  assessLatestVitals(records: VitalRecord[]): PatientVitalsRiskSummary {
    // Group records by type (newest → oldest)
    const byType = new Map<VitalType, VitalRecord[]>();

    for (const rec of records) {
      if (!byType.has(rec.type)) byType.set(rec.type, []);
      byType.get(rec.type)!.push(rec);
    }

    const assessments: VitalRiskAssessment[] = [];

    for (const [type, recList] of byType.entries()) {
      const newest = recList[0];
      const base = this.assessVital(newest);

      if (type === "bp") {
        const recentSystolic = recList
          .slice(0, 10)
          .map((r) => Number(r.systolic ?? NaN))
          .filter((v) => !Number.isNaN(v));

        const recentDiastolic = recList
          .slice(0, 10)
          .map((r) => Number(r.diastolic ?? NaN))
          .filter((v) => !Number.isNaN(v));

        assessments.push({
          ...base,
          recentSystolic,
          recentDiastolic,
        });
      } else {
        const recentValues = recList
          .slice(0, 10)
          .map((r) => Number(r.value ?? NaN))
          .filter((v) => !Number.isNaN(v));

        assessments.push({
          ...base,
          recentValues,
        });
      }
    }

    // Compute overall level (worst of all)
    let overall: RiskLevel = "green";

    for (const a of assessments) {
      if (severityRank[a.level] > severityRank[overall]) {
        overall = a.level;
      }
    }

    return {
      overallLevel: overall,
      assessments,
    };
  },
};
