// src/features/patient/hooks/useAddSocialHistory.ts

import { useState } from "react";
import { SocialHistorySchema, type SocialHistory } from "../models/patientSchemas";
import { db } from "../../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export function useAddSocialHistory(patientId: string) {
  const [social, setSocial] = useState<SocialHistory>({
    tobacco: "",
    alcohol: "",
    exercise: "",
    diet: "",
    sleep: "",
    occupation: "",
    livingSituation: "",
    substances: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof SocialHistory>(
    key: K,
    value: SocialHistory[K]
  ) {
    setSocial((prev) => ({ ...prev, [key]: value }));
  }

  async function saveSocialHistory() {
    try {
      setLoading(true);
      setError(null);

      const validated = SocialHistorySchema.parse(social);

      await updateDoc(doc(db, "patients", patientId), {
        socialHistory: {
          ...validated,
          updatedAt: Date.now(),
        },
      });
    } catch (err: any) {
      console.error("Save social history error:", err);
      setError(err.message || "Failed to save social history.");
    } finally {
      setLoading(false);
    }
  }

  return { social, setField, saveSocialHistory, loading, error };
}
