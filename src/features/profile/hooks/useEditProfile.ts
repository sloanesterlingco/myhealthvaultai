// src/features/profile/hooks/useEditProfile.ts
//
// V1-stable edit profile hook.
// ✅ Uses uploadService.uploadAvatarImage (NO uploadString / base64 path)
// ✅ Writes avatarUrl + photoUrl (web portal friendly) + photoURL (back-compat)
// ✅ Prevents avatar being overwritten with null during saveProfile

import { useEffect, useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../../lib/firebase";

import { uploadAvatarImage } from "../../../services/uploadService";

export interface EditProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  phone: string;
  address: string;
  gender: string;
  bio: string;

  // UI field (legacy name used in some screens)
  photoURL: string | null;
}

function requireUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  return user;
}

/** Drop null/undefined so we don't overwrite existing fields */
function pruneNulls<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export const useEditProfile = () => {
  const [form, setForm] = useState<EditProfileForm>({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    phone: "",
    address: "",
    gender: "",
    bio: "",
    photoURL: null,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const user = auth.currentUser;

  /* -------------------------------------------
     LOAD PROFILE
  -------------------------------------------- */
  useEffect(() => {
    if (user?.uid) void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const u = requireUser();

      const refDoc = doc(db, "patients", u.uid);
      const snap = await getDoc(refDoc);

      if (snap.exists()) {
        const data: any = snap.data();

        // Prefer avatarUrl/photoUrl, but keep photoURL for legacy screens
        const resolvedPhoto =
          data?.avatarUrl || data?.photoUrl || data?.photoURL || null;

        setForm((prev) => ({
          ...prev,
          firstName: data?.firstName ?? "",
          lastName: data?.lastName ?? "",
          email: u.email ?? "",
          dateOfBirth: data?.dateOfBirth ?? "",
          phone: data?.phone ?? "",
          address: data?.address ?? "",
          gender: data?.gender ?? "",
          bio: data?.bio ?? "",
          photoURL: typeof resolvedPhoto === "string" ? resolvedPhoto : null,
        }));
      } else {
        // Create a minimal doc (merge-safe)
        await setDoc(
          refDoc,
          {
            firstName: "",
            lastName: "",
            email: u.email ?? "",
            createdAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    } catch (err) {
      console.log("Failed to load profile:", err);
      Alert.alert("Error", "Unable to load profile.");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------
     UPDATE FIELD
 -------------------------------------------- */
  const setField = (key: keyof EditProfileForm, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /* -------------------------------------------
     AVATAR UPLOAD (V1-stable)
  -------------------------------------------- */
  const onPickAvatar = async () => {
    try {
      const u = requireUser();

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission required", "Allow photo access to choose a profile photo.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (res.canceled) return;

      const asset = res.assets?.[0];
      if (!asset?.uri) return;

      setSaving(true);

      // ✅ Uses your working uploadService (fetch(uri).blob() + uploadBytes)
      const { url, path } = await uploadAvatarImage(asset.uri);

      // ✅ Save URL(s) to Firestore (web + mobile back-compat)
      await setDoc(
        doc(db, "patients", u.uid),
        {
          avatarUrl: url,
          photoUrl: url,     // ✅ web portal friendly
          photoURL: url,     // ✅ legacy back-compat
          avatarPath: path,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setForm((prev) => ({ ...prev, photoURL: url }));
      Alert.alert("Updated", "Profile photo saved.");
    } catch (err: any) {
      console.log("Avatar upload error:", err);
      Alert.alert("Upload failed", err?.message ? String(err.message) : "Unable to upload photo.");
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------
     SAVE PROFILE
  -------------------------------------------- */
  const saveProfile = async (): Promise<boolean> => {
    try {
      setSaving(true);
      const u = requireUser();

      const refDoc = doc(db, "patients", u.uid);

      // ✅ Never overwrite avatar fields with null:
      // Only write photoURL if it's a real string.
      const payload = pruneNulls({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email || u.email || "",
        dateOfBirth: form.dateOfBirth,
        phone: form.phone,
        address: form.address,
        gender: form.gender,
        bio: form.bio,
        ...(typeof form.photoURL === "string" && form.photoURL.length > 0
          ? { photoURL: form.photoURL, avatarUrl: form.photoURL, photoUrl: form.photoURL }
          : {}),
        updatedAt: new Date().toISOString(),
      });

      // updateDoc fails if doc missing; setDoc(merge) is safer for V1
      await setDoc(refDoc, payload, { merge: true });

      Alert.alert("Success", "Your profile has been updated.");
      return true;
    } catch (err) {
      console.log("Save profile error:", err);
      Alert.alert("Error", "Could not save profile.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setField,
    loading,
    saving,
    saveProfile,
    onPickAvatar,
  };
};
