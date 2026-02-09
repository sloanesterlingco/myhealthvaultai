// src/features/patient/screens/PatientProfileScreen.tsx

import React, { useMemo, useState, useCallback } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Input } from "../../../ui/Input";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";

import { usePatientProfile } from "../hooks/usePatientProfile";
import { auth } from "../../../lib/firebase";
import { patientService } from "../../../services/patientService";
import { uploadAvatarImage } from "../../../services/uploadService";

export default function PatientProfileScreen({ navigation }: any) {
  const { profile, setField, save, saving, loading, reloadProfile } = usePatientProfile() as any;

  const uid = auth.currentUser?.uid;
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const avatarUrl = profile?.avatarUrl || profile?.photoURL || null;

  const initials = useMemo(() => {
    const email = auth.currentUser?.email ?? "";
    return (email[0] ?? "U").toUpperCase();
  }, []);

  const pickImage = useCallback(
    async (mode: "library" | "camera") => {
      if (!uid) {
        Alert.alert("Not signed in", "Please sign in to update your profile photo.");
        return;
      }

      try {
        setUploadingAvatar(true);

        if (mode === "library") {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("Permission required", "Allow photo access to choose a profile photo.");
            return;
          }
        } else {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert("Permission required", "Allow camera access to take a photo.");
            return;
          }
        }

        const result =
          mode === "library"
            ? await ImagePicker.launchImageLibraryAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.65,
              })
            : await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.65,
              });

        if (result.canceled) return;

        const uri = result.assets?.[0]?.uri;
        if (!uri) {
          Alert.alert("Could not read photo", "Please try again.");
          return;
        }

        const { url, path } = await uploadAvatarImage(uri);

        await patientService.updatePatientProfile({
          avatarUrl: url,
          avatarPath: path,
          photoBase64: null,
          photoURL: url,
          updatedAt: new Date().toISOString(),
        });

        await reloadProfile?.();
        Alert.alert("Updated", "Profile photo saved.");
      } catch (e: any) {
        Alert.alert("Upload failed", e?.message ? String(e.message) : "Could not save photo.");
      } finally {
        setUploadingAvatar(false);
      }
    },
    [uid, reloadProfile]
  );

  const goInsuranceDetails = () => navigation.navigate(MainRoutes.INSURANCE_DETAILS);
  const goInsuranceOcr = () => navigation.navigate(MainRoutes.DIGITAL_INSURANCE_CARD);
  const goEmergencyContacts = () => navigation.navigate(MainRoutes.EMERGENCY_CONTACTS);

  const onSaveAndContinue = useCallback(async () => {
    try {
      await save?.();
      // ✅ After successful save, go straight to check-in (Dashboard stack)
      navigation.navigate(MainRoutes.DASHBOARD_TAB, {
        screen: MainRoutes.CHECKIN,
      });
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ? String(e.message) : "Please try again.");
    }
  }, [save, navigation]);

  if (loading) {
    return (
      <ScreenContainer showHeader title="Demographics" canGoBack scroll={false}>
        <View style={{ padding: 20 }}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12, color: theme.colors.textSecondary }}>Loading…</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer showHeader title="Demographics" canGoBack scroll contentStyle={{ paddingTop: 0 }}>
      <View style={{ paddingBottom: 36 }}>
        <Text style={styles.subtitle}>
          This is your single source of truth for clinic exports (PDF/QR) and AI summaries.
        </Text>

        {/* Photo */}
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.cardTitle}>Profile photo</Text>
          <Text style={styles.cardSub}>Optional. Helps clinics and caregivers identify you.</Text>

          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInitial}>{initials}</Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Button
                label={uploadingAvatar ? "Uploading…" : "Upload photo"}
                onPress={() => pickImage("library")}
                disabled={uploadingAvatar}
              />
              <View style={{ height: 10 }} />
              <Button
                label={uploadingAvatar ? "Uploading…" : "Take photo"}
                variant="secondary"
                onPress={() => pickImage("camera")}
                disabled={uploadingAvatar}
              />
            </View>
          </View>
        </Card>

        {/* Basics */}
        <Card style={{ marginTop: 14 }}>
          <Text style={styles.cardTitle}>Personal info</Text>

          <Input label="First name" value={profile?.firstName ?? ""} onChangeText={(v: string) => setField("firstName", v)} />
          <Input label="Middle name" value={profile?.middleName ?? ""} onChangeText={(v: string) => setField("middleName", v)} />
          <Input label="Last name" value={profile?.lastName ?? ""} onChangeText={(v: string) => setField("lastName", v)} />
          <Input label="Suffix (Jr., III)" value={profile?.suffix ?? ""} onChangeText={(v: string) => setField("suffix", v)} />

          <Input label="Date of birth (YYYY-MM-DD)" value={profile?.dateOfBirth ?? ""} onChangeText={(v: string) => setField("dateOfBirth", v)} />

          <Input label="Sex assigned at birth" value={profile?.sexAtBirth ?? ""} onChangeText={(v: string) => setField("sexAtBirth", v)} placeholder="e.g. Female" />
          <Input label="Gender identity" value={profile?.genderIdentity ?? ""} onChangeText={(v: string) => setField("genderIdentity", v)} placeholder="e.g. Woman" />
          <Input label="Pronouns" value={profile?.pronouns ?? ""} onChangeText={(v: string) => setField("pronouns", v)} placeholder="e.g. she/her" />

          <Input label="SSN (last 4 only)" value={profile?.ssnLast4 ?? ""} onChangeText={(v: string) => setField("ssnLast4", v)} placeholder="1234" />

          <Input label="Marital status" value={profile?.maritalStatus ?? ""} onChangeText={(v: string) => setField("maritalStatus", v)} />

          <Input label="Race" value={profile?.race ?? ""} onChangeText={(v: string) => setField("race", v)} />
          <Input label="Ethnicity" value={profile?.ethnicity ?? ""} onChangeText={(v: string) => setField("ethnicity", v)} />
        </Card>

        {/* Contact */}
        <Card style={{ marginTop: 14 }}>
          <Text style={styles.cardTitle}>Contact</Text>

          <Input label="Phone" value={profile?.phone ?? ""} onChangeText={(v: string) => setField("phone", v)} />
          <Input label="Email" value={profile?.email ?? auth.currentUser?.email ?? ""} onChangeText={(v: string) => setField("email", v)} />
          <Input label="Preferred contact method (phone/text/email)" value={profile?.preferredContactMethod ?? ""} onChangeText={(v: string) => setField("preferredContactMethod", v)} />

          <Input label="Address" value={profile?.address ?? ""} onChangeText={(v: string) => setField("address", v)} />
          <Input label="City" value={profile?.city ?? ""} onChangeText={(v: string) => setField("city", v)} />
          <Input label="State" value={profile?.state ?? ""} onChangeText={(v: string) => setField("state", v)} />
          <Input label="ZIP" value={profile?.zip ?? ""} onChangeText={(v: string) => setField("zip", v)} />
        </Card>

        {/* Emergency & Care */}
        <Card style={{ marginTop: 14 }}>
          <Text style={styles.cardTitle}>Emergency & care team</Text>
          <Text style={styles.cardSub}>Used for clinic packets and safety context.</Text>

          <Input label="Preferred pharmacy" value={profile?.preferredPharmacy ?? ""} onChangeText={(v: string) => setField("preferredPharmacy", v)} />
          <Input label="Primary care physician (PCP)" value={profile?.pcpName ?? ""} onChangeText={(v: string) => setField("pcpName", v)} />

          <View style={{ height: 10 }} />
          <Button label="Manage emergency contacts" variant="secondary" onPress={goEmergencyContacts} />
        </Card>

        {/* Insurance */}
        <Card style={{ marginTop: 14 }}>
          <Text style={styles.cardTitle}>Insurance</Text>
          <Text style={styles.cardSub}>Add plan info + scan your card so clinic exports are complete.</Text>

          <Input label="Primary insurance carrier" value={profile?.insuranceProvider ?? ""} onChangeText={(v: string) => setField("insuranceProvider", v)} />
          <Input label="Subscriber / Policy ID" value={profile?.memberId ?? ""} onChangeText={(v: string) => setField("memberId", v)} />
          <Input label="Group number" value={profile?.groupNumber ?? ""} onChangeText={(v: string) => setField("groupNumber", v)} />
          <Input label="Insurance phone" value={profile?.insurancePhone ?? ""} onChangeText={(v: string) => setField("insurancePhone", v)} />

          <Input label="Policyholder name" value={profile?.policyholderName ?? ""} onChangeText={(v: string) => setField("policyholderName", v)} />
          <Input label="Policyholder DOB (YYYY-MM-DD)" value={profile?.policyholderDob ?? ""} onChangeText={(v: string) => setField("policyholderDob", v)} />
          <Input label="Policyholder relationship" value={profile?.policyholderRelationship ?? ""} onChangeText={(v: string) => setField("policyholderRelationship", v)} />

          <Input label="Guarantor / Responsible party" value={profile?.guarantorName ?? ""} onChangeText={(v: string) => setField("guarantorName", v)} />

          <View style={{ height: 10 }} />
          <Button label="Insurance details (full)" variant="secondary" onPress={goInsuranceDetails} />
          <View style={{ height: 10 }} />
          <Button label="Scan insurance card (OCR)" onPress={goInsuranceOcr} />
        </Card>

        {/* Social/Admin */}
        <Card style={{ marginTop: 14 }}>
          <Text style={styles.cardTitle}>Administrative</Text>

          <Input label="Preferred language" value={profile?.preferredLanguage ?? ""} onChangeText={(v: string) => setField("preferredLanguage", v)} />
          <Input label="Occupation / Employer" value={profile?.occupation ?? ""} onChangeText={(v: string) => setField("occupation", v)} />
          <Input label="Referral source" value={profile?.referralSource ?? ""} onChangeText={(v: string) => setField("referralSource", v)} />
        </Card>

        <View style={{ height: 14 }} />
        <Button label={saving ? "Saving…" : "Save & Continue to Check-in"} onPress={onSaveAndContinue} disabled={saving} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginTop: 6,
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 6,
  },
  cardSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarCircle: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "rgba(15, 23, 42, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 78, height: 78 },
  avatarInitial: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.colors.text,
  },
});
