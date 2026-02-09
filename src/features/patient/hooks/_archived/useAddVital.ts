// src/features/patient/hooks/useAddVital.ts

import { useState } from "react";
import { addVital } from "../services/patientRepository";
import { VitalSchema, type Vital } from "../models/patientSchemas";

const EMPTY_VITAL: Vital = {
  type: "other",
  value: "",
  label: "",
  units: "",
  date: "",
};

export function useAddVital(patientId: string) {
  const [vital, setVital] = useState<Vital>(EMPTY_VITAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof Vital>(key: K, value: Vital[K]) {
    setVital((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function saveVital() {
    try {
      setLoading(true);
      setError(null);

      const validated = VitalSchema.parse(vital);

      await addVital(patientId, validated);

      setVital(EMPTY_VITAL);
    } catch (err: any) {
      console.error("Save vital error:", err);
      setError(err.message || "Failed to save vital.");
    } finally {
      setLoading(false);
    }
  }

  return { vital, setField, saveVital, loading, error };
}
