// src/features/profile/hooks/usePatientProfile.ts
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { patientService } from "../../../services/patientService";
import * as ImagePicker from "expo-image-picker";
import { uploadAvatarImage } from "../../../services/uploadService";

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface PatientProfile {
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
  photoURL: string | null;
  insuranceProvider: string;
  memberId: string;
  groupNumber: string;
  insurancePhone: string;
  emergencyContacts: EmergencyContact[];
}

export const usePatientProfile = () => {
  const [profile, setProfile] = useState<PatientProfile>({
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
    photoURL: null,
    insuranceProvider: "",
    memberId: "",
    groupNumber: "",
    insurancePhone: "",
    emergencyContacts: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /** Load from Firestore */
  const load = async () => {
    try {
      setLoading(true);
      const data = await patientService.getPatientProfile();
      if (data) setProfile((p) => ({ ...p, ...data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /** Update single field */
  const setField = (key: keyof PatientProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  /** Save everything */
  const save = async () => {
    try {
      setSaving(true);
      await patientService.updatePatientProfile(profile);
      Alert.alert("Success", "Profile saved");
      return true;
    } catch (err) {
      Alert.alert("Error", "Unable to save profile");
      return false;
    } finally {
      setSaving(false);
    }
  };

  /** Avatar upload */
  const uploadAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uploadedUrl = await uploadAvatarImage(asset.uri);

    setField("photoURL", uploadedUrl);
    await save();
  };

  /** Emergency contacts */
  const addEmergencyContact = (contact: EmergencyContact) => {
    setProfile((p) => ({
      ...p,
      emergencyContacts: [...p.emergencyContacts, contact],
    }));
  };

  const deleteEmergencyContact = (index: number) => {
    setProfile((p) => ({
      ...p,
      emergencyContacts: p.emergencyContacts.filter((_, i) => i !== index),
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
  };
};
