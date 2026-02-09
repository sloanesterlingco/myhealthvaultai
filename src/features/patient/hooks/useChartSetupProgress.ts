import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { MainRoutes } from "../../../navigation/types";
import { patientAggregationService } from "../../aiAssistant/services/patientAggregationService";

/**
 * Chart Setup Progress (manual flow)
 * Computes completion across:
 * Demographics → PMH → PSH → Family → Social → Allergies → Medications
 *
 * ✅ NEW BEHAVIOR:
 * We are bypassing separate screens for these steps.
 * "Continue" should navigate into the Check-In flow with an initialStep:
 *  - demographics -> "demo"
 *  - pmh/psh/family/social -> "history"
 *  - allergies/medications -> "medsAllergies"
 */

export type CheckInStepKey =
  | "demo"
  | "emergency"
  | "insurance"
  | "history"
  | "medsAllergies"
  | "review";

type StepKey =
  | "demographics"
  | "pmh"
  | "psh"
  | "family"
  | "social"
  | "allergies"
  | "medications";

type Step = {
  key: StepKey;
  title: string;
  detail?: string;
  done: boolean;

  // ✅ Where this step lives now
  route: MainRoutes; // always CHECKIN for this manual flow
  params: { initialStep: CheckInStepKey };
};

function isDemographicsComplete(demo: any) {
  if (!demo || typeof demo !== "object") return false;
  const first = (demo.firstName ?? demo.first_name ?? "").toString().trim();
  const last = (demo.lastName ?? demo.last_name ?? "").toString().trim();
  const dob = (demo.dateOfBirth ?? demo.dob ?? "").toString().trim();
  return Boolean(first && last && dob);
}

function hasMeaningfulObjectKeys(obj: any) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  return Object.keys(obj).some((k) => {
    const v = (obj as any)[k];
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return true;
  });
}

function mapStepToCheckInInitialStep(stepKey: StepKey): CheckInStepKey {
  switch (stepKey) {
    case "demographics":
      return "demo";

    case "pmh":
    case "psh":
    case "family":
    case "social":
      return "history";

    case "allergies":
    case "medications":
      return "medsAllergies";

    default:
      return "demo";
  }
}

export function useChartSetupProgress() {
  // Forces recompute on focus (and also whenever we manually bump tick)
  const [tick, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setTick((t) => t + 1);
      return () => {};
    }, [])
  );

  const patient: any = useMemo(() => {
    // tick is used only to force recompute on focus
    void tick;
    return patientAggregationService.getPatient?.() ?? {};
  }, [tick]);

  const done = useMemo(() => {
    const demographicsDone = isDemographicsComplete(patient?.demographics);
    const pmhDone = Array.isArray(patient?.conditions) && patient.conditions.length > 0;
    const pshDone = Array.isArray(patient?.surgeries) && patient.surgeries.length > 0;
    const familyDone = Array.isArray(patient?.familyHistory) && patient.familyHistory.length > 0;
    const socialDone = hasMeaningfulObjectKeys(patient?.socialHistory);
    const allergiesDone = Array.isArray(patient?.allergies) && patient.allergies.length > 0;
    const medsDone = Array.isArray(patient?.medications) && patient.medications.length > 0;

    return {
      demographicsDone,
      pmhDone,
      pshDone,
      familyDone,
      socialDone,
      allergiesDone,
      medsDone,
    };
  }, [patient]);

  const steps: Step[] = useMemo(() => {
    // ✅ Everything routes to CHECKIN now, with different initialStep params
    return [
      {
        key: "demographics",
        title: "Demographics",
        detail: "Name, DOB, address, phone",
        done: done.demographicsDone,
        route: MainRoutes.CHECKIN,
        params: { initialStep: "demo" },
      },
      {
        key: "pmh",
        title: "Past Medical History (PMH)",
        detail: "Conditions / diagnoses",
        done: done.pmhDone,
        route: MainRoutes.CHECKIN,
        params: { initialStep: "history" },
      },
      {
        key: "psh",
        title: "Past Surgical History (PSH)",
        detail: "Surgeries / procedures",
        done: done.pshDone,
        route: MainRoutes.CHECKIN,
        params: { initialStep: "history" },
      },
      {
        key: "family",
        title: "Family History",
        detail: "Parents, siblings, hereditary risks",
        done: done.familyDone,
        route: MainRoutes.CHECKIN,
        params: { initialStep: "history" },
      },
      {
        key: "social",
        title: "Social History",
        detail: "Tobacco, alcohol, drugs, occupation",
        done: done.socialDone,
        route: MainRoutes.CHECKIN,
        params: { initialStep: "history" },
      },
      {
        key: "allergies",
        title: "Allergies",
        detail: "Meds, foods, environment",
        done: done.allergiesDone,
        route: MainRoutes.CHECKIN,
        params: { initialStep: "medsAllergies" },
      },
      {
        key: "medications",
        title: "Medications",
        detail: "Current meds + doses",
        done: done.medsDone,
        route: MainRoutes.CHECKIN,
        params: { initialStep: "medsAllergies" },
      },
    ];
  }, [done]);

  const completed = useMemo(() => steps.filter((s) => s.done).length, [steps]);
  const total = steps.length;

  const percent = useMemo(() => {
    if (!total) return 0;
    return Math.round((completed / total) * 100);
  }, [completed, total]);

  const isComplete = completed === total;

  const next = useMemo(() => steps.find((s) => !s.done), [steps]);

  // ✅ What Dashboard should use
  const nextInitialStep: CheckInStepKey = useMemo(() => {
    if (!next) return "demo";
    return mapStepToCheckInInitialStep(next.key);
  }, [next]);

  // ✅ For convenience if other screens want it
  const nextRoute = useMemo(() => {
    return MainRoutes.CHECKIN;
  }, []);

  const nextParams = useMemo(() => {
    return { initialStep: nextInitialStep };
  }, [nextInitialStep]);

  return {
    loading: false,
    isComplete,
    percent,
    completed,
    total,
    steps,

    // ✅ "Continue" routing for the whole app
    nextRoute,
    nextParams,
    nextInitialStep,
  };
}
