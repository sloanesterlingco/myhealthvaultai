// src/features/patient/hooks/useAddFamilyHistory.ts

import { useState } from "react";
import { addFamilyHistoryItem } from "../services/patientRepository";
import type { FamilyHistoryItem } from "../models/patientSchemas";

const EMPTY_FAMILY_HISTORY: FamilyHistoryItem = {
  relation: "",
  condition: "",
  diagnosedAge: undefined,
  notes: "",
};

export function useAddFamilyHistory(patientId: string) {
  const [item, setItem] = useState<FamilyHistoryItem>(EMPTY_FAMILY_HISTORY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof FamilyHistoryItem>(
    key: K,
    value: FamilyHistoryItem[K]
  ) {
    setItem((prev) => ({ ...prev, [key]: value }));
  }

  async function saveFamilyHistory() {
    try {
      setLoading(true);
      setError(null);

      if (!item.relation.trim() || !item.condition.trim()) {
        throw new Error("Relation and condition are required.");
      }

      await addFamilyHistoryItem(patientId, item);
      setItem(EMPTY_FAMILY_HISTORY);
    } catch (err: any) {
      console.error("Save family history error:", err);
      setError(err.message || "Failed to save family history item.");
    } finally {
      setLoading(false);
    }
  }

  return { item, setField, saveFamilyHistory, loading, error };
}
