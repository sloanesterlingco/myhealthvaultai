// src/features/patient/services/dashboardTasks.ts

import type { PatientAggregationModel } from "../../aiAssistant/services/patientAggregationService";
import type { PatientProfile } from "../hooks/usePatientProfile";
import { chartSetupService } from "../../aiAssistant/services/chartSetupService";
import { MainRoutes } from "../../../navigation/types";

export type DashboardTaskId =
  | "chart_setup"
  | "DEMOGRAPHICS_INTRO"
  | "insurance_card"
  | "vitals"
  | "emergency_contact";

export type DashboardTaskStatus = "todo" | "in_progress" | "done";

export type DashboardTask = {
  id: DashboardTaskId;
  title: string;
  description: string;
  status: DashboardTaskStatus;
  dismissedUntil?: string | null; // ISO string
  updatedAt?: string | null; // ISO string

  /** If present, Dashboard can route user directly. */
  route:
    | MainRoutes.CHART_SETUP_INTRO
    | MainRoutes.DEMOGRAPHICS_INTRO
    | MainRoutes.DIGITAL_INSURANCE_CARD
    | MainRoutes.VITALS_TAB
    | MainRoutes.PROFILE_TAB;
  routeParams?: any;
};

function nowISO() {
  return new Date().toISOString();
}

function isSnoozed(dismissedUntil?: string | null) {
  if (!dismissedUntil) return false;
  const t = Date.parse(dismissedUntil);
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

function getDemographicsTasks(patient: PatientAggregationModel): Record<string, any> {
  const d = (patient?.demographics as any) ?? {};
  const tasks = d.tasks && typeof d.tasks === "object" ? d.tasks : {};
  return tasks;
}

function readTaskMeta(
  patient: PatientAggregationModel,
  id: DashboardTaskId
): { status?: DashboardTaskStatus; dismissedUntil?: string | null; updatedAt?: string | null } {
  const tasks = getDemographicsTasks(patient);
  const meta = tasks?.[id] ?? {};
  return {
    status: meta?.status,
    dismissedUntil: meta?.dismissedUntil ?? null,
    updatedAt: meta?.updatedAt ?? null,
  };
}

function deriveEmergencyContactDone(profile?: PatientProfile | null) {
  const list = Array.isArray((profile as any)?.emergencyContacts)
    ? (profile as any).emergencyContacts
    : [];
  return list.length > 0;
}

function deriveInsuranceCardDone(patient: PatientAggregationModel) {
  const insuranceCard = (patient?.demographics as any)?.insuranceCard;
  return Boolean(insuranceCard?.front || insuranceCard?.back);
}

function deriveVitalsDone(patient: PatientAggregationModel) {
  return Array.isArray(patient?.vitals) && patient.vitals.length >= 3;
}

function derivePatientProfileDone(profile?: PatientProfile | null) {
  if (!profile) return false;
  const required = [
    profile.firstName,
    profile.lastName,
    profile.dateOfBirth,
    profile.phone,
  ];
  return required.every((v) => String(v ?? "").trim().length > 0);
}

function deriveChartSetupDone(patient: PatientAggregationModel) {
  try {
    return chartSetupService.isChartComplete(patient as any);
  } catch {
    return false;
  }
}

function normalizeStatus(
  stored: DashboardTaskStatus | undefined,
  derivedDone: boolean
): DashboardTaskStatus {
  if (derivedDone) return "done";
  if (stored === "done") return "done"; // keep done sticky
  if (stored === "in_progress") return "in_progress";
  return "todo";
}

export function getDashboardTasks(input: {
  patient: PatientAggregationModel;
  profile?: PatientProfile | null;
}): { visible: DashboardTask[]; all: DashboardTask[]; hasInProgress: boolean } {
  const { patient, profile } = input;

  const chartDone = deriveChartSetupDone(patient);
  const profileDone = derivePatientProfileDone(profile ?? null);
  const insuranceDone = deriveInsuranceCardDone(patient);
  const vitalsDone = deriveVitalsDone(patient);
  const emergencyDone = deriveEmergencyContactDone(profile ?? null);

  const metaChart = readTaskMeta(patient, "chart_setup");
  const metaProfile = readTaskMeta(patient, "DEMOGRAPHICS_INTRO");
  const metaIns = readTaskMeta(patient, "insurance_card");
  const metaVitals = readTaskMeta(patient, "vitals");
  const metaEC = readTaskMeta(patient, "emergency_contact");

  const all: DashboardTask[] = [
    {
      id: "chart_setup",
      title: "AI Guided Chart Setup",
      description: "Add history, meds, allergies, and key health context.",
      status: normalizeStatus(metaChart.status, chartDone),
      dismissedUntil: metaChart.dismissedUntil,
      updatedAt: metaChart.updatedAt,
      route: MainRoutes.CHART_SETUP_INTRO,
    },
    {
      id: "DEMOGRAPHICS_INTRO",
      title: "Complete Patient Profile",
      description: "Confirm contact info to speed up check-in.",
      status: normalizeStatus(metaProfile.status, profileDone),
      dismissedUntil: metaProfile.dismissedUntil,
      updatedAt: metaProfile.updatedAt,
      route: MainRoutes.DEMOGRAPHICS_INTRO,
    },
    {
      id: "insurance_card",
      title: "Add Insurance Card",
      description: "Capture your card for quick access at clinics.",
      status: normalizeStatus(metaIns.status, insuranceDone),
      dismissedUntil: metaIns.dismissedUntil,
      updatedAt: metaIns.updatedAt,
      route: MainRoutes.DIGITAL_INSURANCE_CARD,
    },
    {
      id: "vitals",
      title: "Add 3 Vitals",
      description: "Unlock better trend insights on your dashboard.",
      status: normalizeStatus(metaVitals.status, vitalsDone),
      dismissedUntil: metaVitals.dismissedUntil,
      updatedAt: metaVitals.updatedAt,
      route: MainRoutes.VITALS_TAB,
    },
    {
      id: "emergency_contact",
      title: "Add Emergency Contact",
      description: "Clinics often require one on file.",
      status: normalizeStatus(metaEC.status, emergencyDone),
      dismissedUntil: metaEC.dismissedUntil,
      updatedAt: metaEC.updatedAt,
      route: MainRoutes.PROFILE_TAB,
    },
  ];

  // Visible list: hide done tasks (optional) + hide snoozed tasks
  const visible = all
    .filter((t) => t.status !== "done")
    .filter((t) => !isSnoozed(t.dismissedUntil))
    .sort((a, b) => {
      // in_progress first, then todo
      const rank = (s: DashboardTaskStatus) => (s === "in_progress" ? 0 : 1);
      return rank(a.status) - rank(b.status);
    });

  const hasInProgress = all.some((t) => t.status === "in_progress");

  return { visible, all, hasInProgress };
}

export function addDaysISO(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function makeTaskMetaUpdate(input: {
  patient: PatientAggregationModel;
  taskId: DashboardTaskId;
  patch: Partial<{ status: DashboardTaskStatus; dismissedUntil: string | null; updatedAt: string }>;
}) {
  const { patient, taskId, patch } = input;
  const demographics = (patient?.demographics as any) ?? {};
  const tasks = demographics.tasks && typeof demographics.tasks === "object" ? demographics.tasks : {};
  const current = tasks?.[taskId] ?? {};
  const next = {
    ...tasks,
    [taskId]: {
      ...current,
      ...patch,
      updatedAt: patch.updatedAt ?? nowISO(),
    },
  };
  return { demographics: { ...demographics, tasks: next } } as any;
}
