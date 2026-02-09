// src/features/patient/hooks/useDashboard.ts

import { useEffect, useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";
import { patientService } from "../../../services/patientService";

/**
 * We keep these types loose on purpose so we don't fight
 * with multiple competing Condition/Patient typings.
 */
export type DashboardPatient = any;
export type DashboardCondition = any;

export const useDashboard = () => {
  const [patient, setPatient] = useState<DashboardPatient | null>(null);
  const [conditions, setConditions] = useState<DashboardCondition[]>([]);

  const { showLoading, hideLoading } = useLoading();
  const { showError } = useToast();

  const loadDashboard = async () => {
    try {
      showLoading();

      const profile = await patientService.getPatientProfile();
      const list = await patientService.getConditions();

      setPatient(profile ?? null);
      setConditions(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
      showError("There was a problem loading your data.");
      setPatient(null);
      setConditions([]);
    } finally {
      hideLoading();
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    patient,
    conditions,
  };
};
