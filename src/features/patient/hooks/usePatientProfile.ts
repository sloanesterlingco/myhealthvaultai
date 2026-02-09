import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { auth, db } from "../../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

import { patientAggregationService } from "../../aiAssistant/services/patientAggregationService";
import { uploadAvatarImage } from "../../../services/uploadService";

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface PatientProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;

  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;

  gender: string;
  bio: string;

  insuranceProvider: string;
  memberId: string;
  groupNumber: string;
  insurancePhone: string;

  emergencyContacts: EmergencyContact[];

  // Avatar fields (portal-friendly)
  avatarUrl?: string | null;
  avatarPath?: string | null;

  // Legacy compat (some screens still use this)
  photoURL: string | null;

  // Portal-friendly alias (optional, but we’ll keep it consistent)
  photoUrl?: string | null;
}

const DEFAULT_PROFILE: PatientProfile = {
  uid: "",
  firstName: "",
  lastName: "",
  email: "",
  dateOfBirth: "",

  phone: "",
  address: "",
  city: "",
  state: "",
  zip: "",

  gender: "",
  bio: "",

  insuranceProvider: "",
  memberId: "",
  groupNumber: "",
  insurancePhone: "",

  emergencyContacts: [],

  avatarUrl: null,
  avatarPath: null,
  photoURL: null,
  photoUrl: null,
};

function toDemographics(profile: PatientProfile) {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    dateOfBirth: profile.dateOfBirth,
    phone: profile.phone,
    address: profile.address,
    city: profile.city,
    state: profile.state,
    zip: profile.zip,
    gender: profile.gender,
    insuranceProvider: profile.insuranceProvider,
    memberId: profile.memberId,
    groupNumber: profile.groupNumber,
    insurancePhone: profile.insurancePhone,
    emergencyContacts: profile.emergencyContacts ?? [],
    // use portal-friendly + legacy keys
    photoURL: profile.photoURL ?? null,
    photoUrl: profile.photoUrl ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    email: profile.email,
  };
}

/** Prevent null/undefined from overwriting good server values */
function pruneNulls<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export function usePatientProfile() {
  const [profile, setProfile] = useState<PatientProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setProfile(DEFAULT_PROFILE);
        return;
      }

      const refDoc = doc(db, "patients", user.uid);
      const snapshot = await getDoc(refDoc);

      if (snapshot.exists()) {
        const data: any = snapshot.data();

        // ✅ Resolve avatar/photo consistently
        const resolvedAvatar: string | null =
          data?.avatarUrl || data?.photoUrl || data?.photoURL || null;

        setProfile({
          ...DEFAULT_PROFILE,
          uid: user.uid,
          email: user.email ?? "",
          ...(data as any),
          avatarUrl: data?.avatarUrl ?? resolvedAvatar,
          photoUrl: data?.photoUrl ?? resolvedAvatar,
          photoURL: data?.photoURL ?? resolvedAvatar,
        } as PatientProfile);
      } else {
        // ✅ Create minimal doc (merge)
        await setDoc(
          refDoc,
          {
            uid: user.uid,
            email: user.email ?? "",
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );

        setProfile({
          ...DEFAULT_PROFILE,
          uid: user.uid,
          email: user.email ?? "",
        });
      }
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key: keyof PatientProfile, value: any) => {
    setProfile((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const save = async () => {
    try {
      setSaving(true);

      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "You are not signed in.");
        return false;
      }

      const uid = user.uid;

      // ✅ Never overwrite avatar fields with null
      // ✅ Use setDoc merge to avoid updateDoc failure if doc missing
      const payload = pruneNulls({
        ...profile,
        uid,
        email: user.email ?? profile.email ?? "",
        updatedAt: new Date().toISOString(),
      });

      await setDoc(doc(db, "patients", uid), payload, { merge: true });

      // Sync into aggregation service (non-blocking)
      try {
        const existing = patientAggregationService.getPatient?.();
        const nextDemo = toDemographics({
          ...profile,
          uid,
          email: user.email ?? profile.email ?? "",
        });

        patientAggregationService.setUser(uid);

        patientAggregationService.setPatient({
          ...(existing as any),
          demographics: {
            ...(existing as any)?.demographics,
            ...nextDemo,
          },
        } as any);

        patientAggregationService.setChartSetupProgress({
          status: "in_progress",
          phase: "medical",
          demographics: {
            ...(existing as any)?.chartSetup?.demographics,
            done: true,
          },
        } as any);

        await patientAggregationService.persistToFirestore(uid);
      } catch (e) {
        console.log("EMR sync failed (non-blocking):", e);
      }

      Alert.alert("Success", "Profile updated!");
      return true;
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not update profile.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * ✅ Single upload path for avatar (uses uploadService.ts)
   * - uploads to Storage via uploadBytes (RN-safe)
   * - writes avatarUrl + photoUrl + photoURL (back-compat)
   * - updates local state so UI updates immediately
   */
  const uploadAvatar = async (uri: string) => {
    try {
      if (!uri) return;

      const user = auth.currentUser;
      if (!user) return;

      setSaving(true);

      const { url, path } = await uploadAvatarImage(uri);

      const update = {
        avatarUrl: url,
        photoUrl: url, // portal-friendly
        photoURL: url, // legacy
        avatarPath: path,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "patients", user.uid), update, { merge: true });

      setProfile((prev) => ({
        ...prev,
        ...update,
      }));

      // Sync into aggregation service (non-blocking)
      try {
        const existing = patientAggregationService.getPatient?.();
        patientAggregationService.setPatient({
          ...(existing as any),
          demographics: {
            ...(existing as any)?.demographics,
            photoURL: url,
            photoUrl: url,
            avatarUrl: url,
          },
        } as any);
        await patientAggregationService.persistToFirestore(user.uid);
      } catch {}

      return url;
    } catch (err) {
      console.error("Avatar upload failed:", err);
      Alert.alert("Upload failed", "Avatar upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addEmergencyContact = (contact: EmergencyContact) => {
    setProfile((prev) => ({
      ...prev,
      emergencyContacts: [...prev.emergencyContacts, contact],
    }));
  };

  const deleteEmergencyContact = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index),
    }));
  };

  return {
    profile,
    loading,
    saving,
    setField,
    save,
    uploadAvatar,
    addEmergencyContact,
    deleteEmergencyContact,
    reloadProfile: load,
  };
}
