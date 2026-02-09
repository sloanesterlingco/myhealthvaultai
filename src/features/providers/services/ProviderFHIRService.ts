
// src/features/providers/services/ProviderFHIRService.ts

import { PatientProfile } from "../../patient/types/PatientProfile";

/**
 * Provider-facing clinical export
 * Supports ICD-10, SNOMED CT, HCPCS, and AI-suggested CPT (not stored)
 */

export interface ProviderClinicalInput {
  profile: PatientProfile;

  encounterId?: string;
  providerId?: string;

  hpi?: string;
  ros?: string;
  assessmentPlan?: string;
  clinicalSummary?: string;

  pmh?: string[];
  psh?: string[];
  medications?: ClinicalMedication[];
  allergies?: ClinicalAllergy[];
  conditions?: ClinicalCondition[];
  procedures?: ClinicalProcedure[];

  vitals?: ProviderVitals;
  labs?: ProviderLabResult[];
  imaging?: ProviderImaging[];

  socialHistory?: string[];
  familyHistory?: string[];

  deviceReadings?: ProviderDeviceData[];

  encounterDate?: string;
}

export interface ClinicalMedication {
  name: string;
  dose?: string;
  route?: string;
  frequency?: string;
  status?: "active" | "completed" | "stopped";
}

export interface ClinicalAllergy {
  substance: string;
  reaction?: string;
  severity?: string;
}

export interface ClinicalCondition {
  code?: string;               // ICD-10 or SNOMED
  codeSystem?: string;         // "ICD-10" | "SNOMED"
  display: string;
  status?: string;
}

export interface ClinicalProcedure {
  code?: string;               // SNOMED or HCPCS
  codeSystem?: string;         // "SNOMED" | "HCPCS"
  display: string;
  date?: string;               // YYYY-MM-DD
  cptSuggestion?: string;      // AI-suggested CPT (not required, not stored)
}

export interface ProviderVitals {
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  spo2?: number;
  respiratoryRate?: number;
  tempF?: number;
  weightLbs?: number;
  heightIn?: number;
}

export interface ProviderLabResult {
  loinc: string;
  display: string;
  value: number | string;
  unit?: string;
}

export interface ProviderImaging {
  type: string;
  report?: string;
}

export interface ProviderDeviceData {
  type: string;
  value: number | string;
  unit?: string;
  date?: string;
}

/* ---------------------------------------------------------
   SYSTEM URLS FOR TERMINOLOGIES
--------------------------------------------------------- */

const SYSTEMS = {
  ICD10: "http://hl7.org/fhir/sid/icd-10-cm",
  SNOMED: "http://snomed.info/sct",
  HCPCS: "https://www.cms.gov/hcpcs",
  CPT: "http://www.ama-assn.org/go/cpt", // For suggestions only
};

/* ---------------------------------------------------------
   Helper: CONDITION resource builder
--------------------------------------------------------- */
function mapConditionFHIR(cond: ClinicalCondition, patientId: string) {
  let coding: any[] = [];

  if (cond.code && cond.codeSystem) {
    coding.push({
      system:
        cond.codeSystem === "ICD-10"
          ? SYSTEMS.ICD10
          : cond.codeSystem === "SNOMED"
          ? SYSTEMS.SNOMED
          : undefined,
      code: cond.code,
      display: cond.display,
    });
  }

  return {
    resourceType: "Condition",
    clinicalStatus: {
      coding: [
        {
          system:
            "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: cond.status || "active",
        },
      ],
    },
    code: coding.length ? { coding } : { text: cond.display },
    subject: { reference: `Patient/${patientId}` },
  };
}

/* ---------------------------------------------------------
   Helper: PROCEDURE resource builder
--------------------------------------------------------- */
function mapProcedureFHIR(proc: ClinicalProcedure, patientId: string) {
  let coding: any[] = [];

  if (proc.code && proc.codeSystem) {
    coding.push({
      system:
        proc.codeSystem === "SNOMED"
          ? SYSTEMS.SNOMED
          : proc.codeSystem === "HCPCS"
          ? SYSTEMS.HCPCS
          : undefined,
      code: proc.code,
      display: proc.display,
    });
  }

  // AI-suggested CPT (not stored in DB)
  if (proc.cptSuggestion) {
    coding.push({
      system: SYSTEMS.CPT,
      code: proc.cptSuggestion,
      display: `${proc.display} (AI CPT Suggestion)`,
    });
  }

  return {
    resourceType: "Procedure",
    status: "completed",
    subject: { reference: `Patient/${patientId}` },
    code: coding.length ? { coding } : { text: proc.display },
    performedDateTime: proc.date,
  };
}

/* ---------------------------------------------------------
   VITAL OBSERVATION BUILDER
--------------------------------------------------------- */
function buildVitalObservation(
  loinc: string,
  display: string,
  value: any,
  unit: string,
  patientId: string,
  encounterId: string
) {
  if (value === null || value === undefined) return null;

  return {
    resourceType: "Observation",
    status: "final",
    code: {
      coding: [{ system: "http://loinc.org", code: loinc, display }],
    },
    subject: { reference: `Patient/${patientId}` },
    encounter: { reference: `Encounter/${encounterId}` },
    valueQuantity: { value, unit },
  };
}

/* ---------------------------------------------------------
   MAIN FHIR EXPORT BUILDER
--------------------------------------------------------- */

export function buildProviderFHIR(input: ProviderClinicalInput): any {
  const {
    profile,
    encounterId = `enc-${Date.now()}`,
    providerId = "provider-unknown",

    hpi,
    ros,
    assessmentPlan,
    clinicalSummary,

    pmh = [],
    psh = [],
    medications = [],
    allergies = [],
    conditions = [],
    procedures = [],

    vitals,
    labs = [],
    imaging = [],

    socialHistory = [],
    familyHistory = [],
    deviceReadings = [],

    encounterDate = new Date().toISOString(),
  } = input;

  const bundle = {
    resourceType: "Bundle",
    type: "collection",
    entry: [] as any[],
  };

  const add = (resource: any) => bundle.entry.push({ resource });

  /* ---------------------------------------------------------
     PATIENT
  --------------------------------------------------------- */
  add({
    resourceType: "Patient",
    id: profile.uid,
    name: [{ family: profile.lastName, given: [profile.firstName] }],
    telecom: profile.phone
      ? [{ system: "phone", value: profile.phone }]
      : [],
    birthDate: profile.dateOfBirth,
  });

  /* ---------------------------------------------------------
     ENCOUNTER
  --------------------------------------------------------- */
  add({
    resourceType: "Encounter",
    id: encounterId,
    status: "finished",
    class: { code: "AMB" },
    subject: { reference: `Patient/${profile.uid}` },
    period: { start: encounterDate, end: encounterDate },
  });

  /* ---------------------------------------------------------
     NARRATIVES
  --------------------------------------------------------- */
  const addNarrative = (title: string, text?: string) => {
    if (!text) return;
    add({
      resourceType: "Observation",
      status: "final",
      code: { text: title },
      subject: { reference: `Patient/${profile.uid}` },
      encounter: { reference: `Encounter/${encounterId}` },
      valueString: text,
    });
  };

  addNarrative("HPI", hpi);
  addNarrative("Review of Systems", ros);
  addNarrative("Assessment & Plan", assessmentPlan);
  addNarrative("Clinical Summary", clinicalSummary);

  /* ---------------------------------------------------------
     LISTS (PMH, PSH, Social, Family)
  --------------------------------------------------------- */
  const addList = (title: string, items: string[]) => {
    if (!items.length) return;
    add({
      resourceType: "List",
      status: "current",
      mode: "snapshot",
      title,
      subject: { reference: `Patient/${profile.uid}` },
      entry: items.map((x) => ({ item: { display: x } })),
    });
  };

  addList("Past Medical History", pmh);
  addList("Past Surgical History", psh);
  addList("Social History", socialHistory);
  addList("Family History", familyHistory);

  /* ---------------------------------------------------------
     CONDITIONS
  --------------------------------------------------------- */
  conditions.forEach((c) =>
    add(mapConditionFHIR(c, profile.uid))
  );

  /* ---------------------------------------------------------
     PROCEDURES (SNOMED + HCPCS + CPT suggestions)
  --------------------------------------------------------- */
  procedures.forEach((p) =>
    add(mapProcedureFHIR(p, profile.uid))
  );

  /* ---------------------------------------------------------
     ALLERGIES
  --------------------------------------------------------- */
  allergies.forEach((a) =>
    add({
      resourceType: "AllergyIntolerance",
      clinicalStatus: { text: "active" },
      code: { text: a.substance },
      reaction: a.reaction ? [{ description: a.reaction }] : undefined,
      criticality: a.severity,
      patient: { reference: `Patient/${profile.uid}` },
    })
  );

  /* ---------------------------------------------------------
     MEDICATIONS
  --------------------------------------------------------- */
  medications.forEach((m) =>
    add({
      resourceType: "MedicationStatement",
      status: m.status || "active",
      medicationCodeableConcept: {
        text: `${m.name} ${m.dose || ""} ${m.route || ""} ${
          m.frequency || ""
        }`,
      },
      subject: { reference: `Patient/${profile.uid}` },
    })
  );

  /* ---------------------------------------------------------
     VITALS (LOINC-coded)
  --------------------------------------------------------- */
  if (vitals) {
    const v = vitals;
    const obs = [
      buildVitalObservation("8480-6", "Systolic BP", v.systolic, "mmHg", profile.uid, encounterId),
      buildVitalObservation("8462-4", "Diastolic BP", v.diastolic, "mmHg", profile.uid, encounterId),
      buildVitalObservation("8867-4", "Heart Rate", v.heartRate, "beats/min", profile.uid, encounterId),
      buildVitalObservation("59408-5", "SpO2", v.spo2, "%", profile.uid, encounterId),
      buildVitalObservation("9279-1", "Respiration Rate", v.respiratoryRate, "breaths/min", profile.uid, encounterId),
      buildVitalObservation("8310-5", "Body Temperature", v.tempF, "°F", profile.uid, encounterId),
      buildVitalObservation("29463-7", "Body Weight", v.weightLbs, "lb", profile.uid, encounterId),
      buildVitalObservation("8302-2", "Body Height", v.heightIn, "in", profile.uid, encounterId),
    ];

    obs.forEach((o) => o && add(o));
  }

  /* ---------------------------------------------------------
     LABS (LOINC-coded)
  --------------------------------------------------------- */
  labs.forEach((lab) =>
    add({
      resourceType: "Observation",
      status: "final",
      code: {
        coding: [
          { system: "http://loinc.org", code: lab.loinc, display: lab.display },
        ],
      },
      subject: { reference: `Patient/${profile.uid}` },
      encounter: { reference: `Encounter/${encounterId}` },
      valueQuantity: lab.unit ? { value: lab.value, unit: lab.unit } : undefined,
      valueString: !lab.unit ? String(lab.value) : undefined,
    })
  );

  /* ---------------------------------------------------------
     IMAGING
  --------------------------------------------------------- */
  imaging.forEach((img) =>
    add({
      resourceType: "DiagnosticReport",
      status: "final",
      code: { text: img.type },
      result: [],
      conclusion: img.report,
      subject: { reference: `Patient/${profile.uid}` },
      encounter: { reference: `Encounter/${encounterId}` },
    })
  );

  /* ---------------------------------------------------------
     DEVICE DATA
  --------------------------------------------------------- */
  deviceReadings.forEach((d) =>
    add({
      resourceType: "Observation",
      status: "final",
      code: { text: d.type },
      subject: { reference: `Patient/${profile.uid}` },
      valueQuantity: d.unit ? { value: d.value, unit: d.unit } : undefined,
      valueString: !d.unit ? String(d.value) : undefined,
      effectiveDateTime: d.date,
    })
  );

  return bundle;
}
