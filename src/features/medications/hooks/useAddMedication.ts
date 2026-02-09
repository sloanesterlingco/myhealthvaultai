// src/features/medications/hooks/useAddMedication.ts

import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "../../../lib/firebase";
import { ensurePatientCoreOnce } from "../../patient/services/ensurePatientCore";

type MedicationDraft = {
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate: string;
  notes: string;
  status: "active" | "stopped" | "unknown";
};

type Field = keyof MedicationDraft;

function nowMs() {
  return Date.now();
}

export function useAddMedication() {
  const [saving, setSaving] = useState(false);

  const [medication, setMedication] = useState<MedicationDraft>({
    name: "",
    dosage: "",
    frequency: "",
    startDate: "",
    endDate: "",
    notes: "",
    status: "active",
  });

  const setField = useCallback((key: Field, value: string) => {
    setMedication((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const canSave = useMemo(() => medication.name.trim().length > 0, [medication.name]);

  const saveMedication = useCallback(async () => {
    const user = auth.currentUser;
    const uid = user?.uid;

    if (!uid) {
      Alert.alert("Sign in required", "Please sign in to save medications.");
      return;
    }

    if (!canSave) {
      Alert.alert("Missing name", "Please enter a medication name.");
      return;
    }

    setSaving(true);
    try {
      // ✅ Ensure patients/{uid} exists (prevents subcollection rule issues)
      await ensurePatientCoreOnce(uid);

      // ✅ Canonical portal-friendly path:
      // patients/{uid}/medications/{medId}
      const medsCol = collection(db, `patients/${uid}/medications`);
      const medRef = doc(medsCol); // auto-id
      const ms = nowMs();

      const payload = {
        id: medRef.id,

        name: medication.name.trim(),
        dosage: medication.dosage.trim() || null,
        frequency: medication.frequency.trim() || null,
        startDate: medication.startDate.trim() || null,
        endDate: medication.endDate.trim() || null,
        notes: medication.notes.trim() || null,
        status: medication.status ?? "active",

        // ✅ Portal-friendly numeric timestamps
        createdAtMs: ms,
        updatedAtMs: ms,

        // ✅ Firestore-friendly timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        // Helps you later (portal/app/audit)
        source: "app",
      };

      await setDoc(medRef, payload, { merge: true });

      Alert.alert("Saved", "Medication saved.");
      setMedication({
        name: "",
        dosage: "",
        frequency: "",
        startDate: "",
        endDate: "",
        notes: "",
        status: "active",
      });
    } catch (e) {
      console.log("saveMedication error:", e);
      Alert.alert("Error", "Unable to save medication.");
    } finally {
      setSaving(false);
    }
  }, [canSave, medication]);

  return { medication, setField, saveMedication, saving };
}
