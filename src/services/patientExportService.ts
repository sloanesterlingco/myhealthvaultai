// src/services/patientExportService.ts
// ---------------------------------------------------------
// Build full EMRExport object + generate provider-ready
// chart note in clinical format (HPI → PMH → PSH → Meds → Allergies → SH → FH).
// ---------------------------------------------------------

import {
  patientService,
  type PatientProfile,
  type Condition,
  type Medication,
  type LabResult,
  type Appointment,
} from "./patientService";

import { auth } from "../lib/firebase";

import { vitalsService, type VitalDoc } from "../features/vitals/services/vitalsService";

import { hpiService, type HPIEntry } from "../features/hpi/services/hpiService";

import { surgeriesService, type SurgeryRecord } from "../features/surgeries/services/surgeriesService";

import { allergiesService } from "../features/allergies/services/allergiesService";
import type { Allergy } from "../features/allergies/types/allergyTypes";

import { familyHistoryService } from "../features/familyHistory/services/familyHistoryService";

type FamilyHistoryRow = {
  id?: string;
  relation?: string;
  condition?: string;
  diagnosedAge?: number;
  notes?: string;
  [key: string]: any;
};


import { socialHistoryService } from "../features/socialHistory/services/socialHistoryService";

// ----------------------------------------------------------------------
// EMRExport TYPES
// ----------------------------------------------------------------------

export interface EMRExportProfileCore {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  sexAtBirth?: string;
  phone?: string;
  email?: string;
}

export interface EMRExportCondition {
  name: string;
  status?: string;
  diagnosed?: string;
  notes?: string;
}

export interface EMRExportMedication {
  name: string;
  dose?: string;
  frequency?: string;
  route?: string;
  reason?: string;
  issues?: string;
  startedAt?: string;
  stoppedAt?: string | null;
}

export interface EMRExportAllergy {
  substance: string;
  reaction?: string;
  notes?: string;
  severity?: "mild" | "moderate" | "severe";
}

export interface EMRExportSurgery {
  procedure: string;
  year?: string;
  location?: string;
  notes?: string;
}

export interface EMRExportFamilyHistory {
  relation: string;
  condition: string;
  diagnosedAge?: number;
  notes?: string;
}

export interface EMRExportVital {
  type: string;
  label?: string;
  value: string | number;
  units?: string;
  date?: string;
}

export interface EMRExportLab {
  name: string;
  value: string | number;
  units?: string;
  date?: string;
  referenceRange?: string;
  notes?: string;
}

export interface EMRExportAppointment {
  date: string;
  reason?: string;
  providerName?: string;
}

export interface EMRExportSocialHistory {
  tobaccoUse?: string;
  alcoholUse?: string;
  substanceUse?: string;
  occupation?: string;
  livingSituation?: string;
  exercise?: string;
  diet?: string;
}

export interface EMRExport {
  generatedAt: string;
  profile: {
    core: EMRExportProfileCore;
  };
  hpi: HPIEntry[];
  socialHistory: EMRExportSocialHistory | null;

  conditions: EMRExportCondition[];
  medications: EMRExportMedication[];
  allergies: EMRExportAllergy[];
  surgeries: EMRExportSurgery[];
  familyHistory: EMRExportFamilyHistory[];
  vitals: EMRExportVital[];
  labs: EMRExportLab[];
  symptoms: any[]; // placeholder for future symptom storage
  appointments: EMRExportAppointment[];
}

// ----------------------------------------------------------------------
// Internal mapping helpers
// ----------------------------------------------------------------------

function mapProfileToCore(profile: PatientProfile | null): EMRExportProfileCore {
  if (!profile) return {};
  return {
    firstName: (profile as any).firstName,
    lastName: (profile as any).lastName,
    // Your earlier screen used dateOfBirth, your older code used dob — support both
    dateOfBirth: (profile as any).dateOfBirth ?? (profile as any).dob,
    sexAtBirth: (profile as any).gender,
    phone: (profile as any).phone,
    email: (profile as any).email,
  };
}

function mapConditions(conditions: Condition[]): EMRExportCondition[] {
  return (conditions ?? []).map((c: any) => ({
    name: c.name,
    status: c.status,
    diagnosed: c.onsetDate,
    notes: c.description,
  }));
}

function mapMedications(meds: Medication[]): EMRExportMedication[] {
  return (meds ?? []).map((m: any) => ({
    name: m.name ?? m.genericName ?? "",
    dose: m.dosage,
    frequency: m.frequency,
    route: m.route,
    reason: undefined,
    issues: undefined,
    startedAt: m.startDate,
    stoppedAt: m.endDate ?? null,
  }));
}

function mapLabs(labs: LabResult[]): EMRExportLab[] {
  return (labs ?? []).map((l: any) => ({
    name: l.testName,
    value: l.value ?? "",
    units: l.unit,
    date: l.date,
    referenceRange: l.referenceRange,
    notes: undefined,
  }));
}

function mapVitals(vitals: VitalDoc[]): EMRExportVital[] {
  return (vitals ?? []).map((v: any) => {
    switch (v.type) {
      case "bp":
        return {
          type: "bp",
          label: "Blood Pressure",
          value:
            v.systolic != null && v.diastolic != null ? `${v.systolic}/${v.diastolic}` : "",
          units: "mmHg",
          date: v.timestamp,
        };
      case "hr":
        return { type: "hr", label: "Heart Rate", value: v.value ?? 0, units: "bpm", date: v.timestamp };
      case "spo2":
        return { type: "spo2", label: "SpO₂", value: v.value ?? 0, units: "%", date: v.timestamp };
      case "rr":
        return { type: "rr", label: "Respiratory Rate", value: v.value ?? 0, units: "breaths/min", date: v.timestamp };
      case "temp":
        return { type: "temp", label: "Temperature", value: v.value ?? 0, units: "°F", date: v.timestamp };
      case "weight":
        return { type: "weight", label: "Weight", value: v.value ?? 0, units: "lb", date: v.timestamp };
      default:
        return { type: v.type, value: v.value ?? "", units: undefined, date: v.timestamp };
    }
  });
}

function mapAppointments(appts: Appointment[]): EMRExportAppointment[] {
  return (appts ?? []).map((a: any) => ({
    date: a.date,
    reason: a.reason,
    providerName: a.providerName,
  }));
}

function mapAllergies(allergies: Allergy[]): EMRExportAllergy[] {
  return (allergies ?? []).map((a: any) => ({
    substance: a.substance,
    reaction: a.reaction,
    notes: a.notes,
    severity: a.severity,
  }));
}

function mapSurgeries(surgeries: SurgeryRecord[]): EMRExportSurgery[] {
  return (surgeries ?? []).map((s: any) => ({
    procedure: s.procedure,
    year: s.year,
    location: (s as any).location, // your SurgeryRecord doesn't include location, but keep compatibility
    notes: s.notes,
  }));
}

function mapFamilyHistory(entries: FamilyHistoryRow[]): EMRExportFamilyHistory[] {

  return (entries ?? []).map((f: any) => ({
    relation: f.relation,
    condition: f.condition,
    diagnosedAge: f.diagnosedAge,
    notes: f.notes,
  }));
}

// ✅ Social history is stored as ONE Firestore doc, not an array
function mapSocialHistoryDoc(docData: any): EMRExportSocialHistory | null {
  if (!docData || typeof docData !== "object") return null;
  return {
    tobaccoUse: docData.tobaccoUse,
    alcoholUse: docData.alcoholUse,
    substanceUse: docData.substanceUse,
    occupation: docData.occupation,
    livingSituation: docData.livingSituation,
    exercise: docData.exercise,
    diet: docData.diet,
  };
}

// ----------------------------------------------------------------------
// BUILD THE FULL EMR EXPORT
// ----------------------------------------------------------------------

export async function buildPatientExport(): Promise<EMRExport> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    // You can also throw here if you'd rather fail loudly.
    return {
      generatedAt: new Date().toISOString(),
      profile: { core: {} },
      hpi: [],
      socialHistory: null,
      conditions: [],
      medications: [],
      allergies: [],
      surgeries: [],
      familyHistory: [],
      vitals: [],
      labs: [],
      symptoms: [],
      appointments: [],
    };
  }

  const [
    profile,
    conditions,
    medications,
    labs,
    appointments,
    vitals,
    hpiEntries,
    allergyEntries,
    surgeryEntries,
    familyHistoryEntries,
    socialHistoryDoc,
  ] = await Promise.all([
    patientService.getPatientProfile(),
    patientService.getConditions(),
    patientService.getMedications(),
    patientService.getLabResults(),
    patientService.getAppointments(),
    vitalsService.getAllVitals(),
    hpiService.getHPI(),
    allergiesService.getAllergies(),
    surgeriesService.listSurgeries(uid), // ✅ matches your surgeriesService.ts
    familyHistoryService.getFamilyHistory(),
    socialHistoryService.getSocialHistory(), // ✅ returns docData | null
  ]);

  return {
    generatedAt: new Date().toISOString(),
    profile: { core: mapProfileToCore(profile) },
    hpi: hpiEntries ?? [],
    socialHistory: mapSocialHistoryDoc(socialHistoryDoc),

    conditions: mapConditions(conditions ?? []),
    medications: mapMedications(medications ?? []),
    allergies: mapAllergies(allergyEntries ?? []),
    surgeries: mapSurgeries(surgeryEntries ?? []),
    familyHistory: mapFamilyHistory(familyHistoryEntries ?? []),
    vitals: mapVitals(vitals ?? []),
    labs: mapLabs(labs ?? []),
    symptoms: [],
    appointments: mapAppointments(appointments ?? []),
  };
}

// ----------------------------------------------------------------------
// 🚀 PROVIDER NOTE GENERATOR
// ----------------------------------------------------------------------

export function generateProviderSummaryNote(emr: EMRExport): string {
  const lines: string[] = [];

  lines.push("**HISTORY OF PRESENT ILLNESS (HPI)**");
  if (!emr.hpi?.length) {
    lines.push("No HPI recorded.\n");
  } else {
    emr.hpi.forEach((h: any) => {
      lines.push(`Chief complaint: ${h.chiefComplaint || "N/A"}`);
      if (h.onset) lines.push(`Onset: ${h.onset}`);
      if (h.duration) lines.push(`Duration: ${h.duration}`);
      if (h.severity) lines.push(`Severity: ${h.severity}`);
      if (h.progression) lines.push(`Progression: ${h.progression}`);
      if (h.modifyingFactors) lines.push(`Modifying factors: ${h.modifyingFactors}`);
      if (h.associatedSymptoms?.length) lines.push(`Associated symptoms: ${h.associatedSymptoms.join(", ")}`);
      if (h.context) lines.push(`Context: ${h.context}`);
      if (h.notes) lines.push(`Notes: ${h.notes}`);
      lines.push("");
    });
  }

  lines.push("**PAST MEDICAL HISTORY (PMH)**");
  if (!emr.conditions?.length) {
    lines.push("No recorded past medical history.\n");
  } else {
    emr.conditions.forEach((c) => {
      const dx = c.diagnosed ? ` (dx ${c.diagnosed})` : "";
      const status = c.status ? ` — ${c.status}` : "";
      lines.push(`• ${c.name}${dx}${status}`);
      if (c.notes) lines.push(`   Notes: ${c.notes}`);
    });
    lines.push("");
  }

  lines.push("**PAST SURGICAL HISTORY (PSH)**");
  if (!emr.surgeries?.length) {
    lines.push("No surgical history reported.\n");
  } else {
    emr.surgeries.forEach((s) => {
      const when = s.year ? ` (${s.year})` : "";
      const where = s.location ? ` @ ${s.location}` : "";
      lines.push(`• ${s.procedure}${when}${where}`);
      if (s.notes) lines.push(`   Notes: ${s.notes}`);
    });
    lines.push("");
  }

  lines.push("**MEDICATIONS**");
  if (!emr.medications?.length) {
    lines.push("No active medications.\n");
  } else {
    emr.medications.forEach((m) => {
      const dose = m.dose ? ` — ${m.dose}` : "";
      const freq = m.frequency ? `, ${m.frequency}` : "";
      const route = m.route ? ` (${m.route})` : "";
      lines.push(`• ${m.name}${dose}${freq}${route}`);
    });
    lines.push("");
  }

  lines.push("**ALLERGIES**");
  if (!emr.allergies?.length) {
    lines.push("No known allergies.\n");
  } else {
    emr.allergies.forEach((a) => {
      let line = `• ${a.substance}`;
      if (a.reaction) line += ` → ${a.reaction}`;
      if (a.severity) line += ` (${a.severity})`;
      lines.push(line);
      if (a.notes) lines.push(`   Notes: ${a.notes}`);
    });
    lines.push("");
  }

  lines.push("**SOCIAL HISTORY**");
  if (!emr.socialHistory) {
    lines.push("No social history provided.\n");
  } else {
    const sh = emr.socialHistory;
    if (sh.tobaccoUse) lines.push(`• Tobacco: ${sh.tobaccoUse}`);
    if (sh.alcoholUse) lines.push(`• Alcohol: ${sh.alcoholUse}`);
    if (sh.substanceUse) lines.push(`• Substance Use: ${sh.substanceUse}`);
    if (sh.occupation) lines.push(`• Occupation: ${sh.occupation}`);
    if (sh.livingSituation) lines.push(`• Living Situation: ${sh.livingSituation}`);
    if (sh.exercise) lines.push(`• Exercise: ${sh.exercise}`);
    if (sh.diet) lines.push(`• Diet: ${sh.diet}`);
    lines.push("");
  }

  lines.push("**FAMILY HISTORY (FH)**");
  if (!emr.familyHistory?.length) {
    lines.push("No family history reported.\n");
  } else {
    emr.familyHistory.forEach((f) => {
      const dxAge = f.diagnosedAge ? ` (dx @ ${f.diagnosedAge} yrs)` : "";
      lines.push(`• ${f.relation}: ${f.condition}${dxAge}`);
      if (f.notes) lines.push(`   Notes: ${f.notes}`);
    });
    lines.push("");
  }

  lines.push("**VITALS (Most Recent)**");
  if (!emr.vitals?.length) {
    lines.push("No vitals recorded.\n");
  } else {
    const latestByType: Record<string, EMRExportVital> = {};
    for (const v of emr.vitals) {
      if (!latestByType[v.type]) latestByType[v.type] = v;
    }
    Object.values(latestByType).forEach((v) => {
      lines.push(`• ${v.label ?? v.type}: ${v.value}${v.units ? ` ${v.units}` : ""}`);
    });
    lines.push("");
  }

  lines.push("**RECENT LAB RESULTS**");
  if (!emr.labs?.length) {
    lines.push("No labs on file.\n");
  } else {
    emr.labs.slice(0, 10).forEach((l) => {
      lines.push(
        `• ${l.name}: ${l.value}${l.units ? ` ${l.units}` : ""}${l.referenceRange ? ` (ref: ${l.referenceRange})` : ""}`
      );
    });
    lines.push("");
  }

  lines.push("**APPOINTMENTS**");
  if (!emr.appointments?.length) {
    lines.push("No upcoming or recent appointments.\n");
  } else {
    emr.appointments.forEach((a) => {
      lines.push(`• ${a.date} — ${a.reason ?? "Visit"}${a.providerName ? ` (Provider: ${a.providerName})` : ""}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

export const patientExportService = {
  buildPatientExport,
  generateProviderSummaryNote,
};
