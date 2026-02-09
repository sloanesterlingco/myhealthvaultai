import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../../lib/firebase";

/** Body location chip type */
export type BodyLocation = {
  id: string;
  label: string;
};

export const BODY_LOCATIONS: BodyLocation[] = [
  { id: "chest", label: "Chest" },
  { id: "abdomen", label: "Abdomen" },
  { id: "back", label: "Back" },
  { id: "head", label: "Head" },
  { id: "arm", label: "Arm" },
  { id: "leg", label: "Leg" },
  { id: "other", label: "Other" },
];

export type OnsetInfo = {
  onsetText: string;
  onsetISO: string;
};

export type TreatmentEntry = {
  name: string;
  dose?: string;
  timing?: string;
  response?: string;
};

export type HPIData = {
  chiefComplaint?: string;
  location?: BodyLocation;
  severity?: number;

  quality?: string[];
  radiation?: string[];

  associatedSymptoms?: string[];
  aggravatingFactors?: string[];
  relievingFactors?: string[];

  onset?: OnsetInfo;
  timing?: string[];
  duration?: string[];
  frequency?: string[];
  previousEpisodes?: string[];
  progression?: string[];

  context?: string;
  impactOnLife?: string[];
  patientConcerns?: string[];
  functionalLimitations?: string[];

  riskFactors?: string[];
  exposures?: string[];
  redFlags?: string[];
  socialHistoryImpact?: string[];
  characterDescription?: string[];

  treatmentsTried?: TreatmentEntry[];

  narrative?: string;

  /** NEW FIELD — to fix ProviderVisitPacketScreen */
  voiceNote?: string;
};

export function useHPI() {
  const [hpi, setHPI] = useState<HPIData>({});
  const [docId, setDocId] = useState<string | null>(null);
  const [hasEverSaved, setHasEverSaved] = useState(false);

  const updateField = <K extends keyof HPIData>(key: K, value: HPIData[K]) => {
    setHPI((prev) => ({ ...prev, [key]: value }));
  };

  const saveImmediate = async (override?: Partial<HPIData>) => {
    try {
      const payload = {
        ...hpi,
        ...override,
        updatedAt: serverTimestamp(),
      };

      if (!hasEverSaved) {
        const ref = await addDoc(collection(db, "hpiEntries"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setDocId(ref.id);
        setHasEverSaved(true);
      } else if (docId) {
        await setDoc(doc(db, "hpiEntries", docId), payload, { merge: true });
      }
    } catch (err) {
      console.error("Error saving HPI:", err);
    }
  };

  const saveHPI = async () => {
    await saveImmediate();
  };

  useEffect(() => {
    if (Object.keys(hpi).length === 0) return;

    const timeout = setTimeout(() => {
      saveImmediate();
    }, 1200);

    return () => clearTimeout(timeout);
  }, [hpi]);

  return {
    hpi,
    updateField,
    saveHPI,
  };
}
