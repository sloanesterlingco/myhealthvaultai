// src/features/patient/hooks/useAddSurgery.ts

import { useState } from "react";
import { addSurgery } from "../services/patientRepository";
import type { Surgery } from "../models/patientSchemas";

const EMPTY_SURGERY: Surgery = {
  procedure: "",
  year: "",
  location: "",
  notes: "",
};

export function useAddSurgery(patientId: string) {
  const [surgery, setSurgery] = useState<Surgery>(EMPTY_SURGERY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof Surgery>(key: K, value: Surgery[K]) {
    setSurgery((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function saveSurgery() {
    try {
      setLoading(true);
      setError(null);

      if (!surgery.procedure || surgery.procedure.trim().length === 0) {
        throw new Error("Procedure name is required.");
      }

      await addSurgery(patientId, surgery);

      setSurgery(EMPTY_SURGERY);
    } catch (err: any) {
      console.error("Save surgery error:", err);
      setError(err.message || "Failed to save surgery.");
    } finally {
      setLoading(false);
    }
  }

  return {
    surgery,
    setField,
    saveSurgery,
    loading,
    error,
  };
}
