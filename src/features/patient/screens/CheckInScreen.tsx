// src/features/patient/screens/CheckInScreen.tsx
//
// V1 Check-In Hub (OUTPUT ONLY)
// - Generate PDF packet
// - Generate QR code
// If demographics incomplete -> button goes to PATIENT_PROFILE (canonical hub)

import React, { useMemo, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { SectionHeader } from "../../../ui/SectionHeader";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

import { usePatientProfile } from "../hooks/usePatientProfile";
import { MainRoutes } from "../../../navigation/types";

function buildMinimalQrPayload(profile: any) {
  return JSON.stringify({
    type: "checkin",
    cid: profile?.uid ?? "",
    name: `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim(),
    dob: profile?.dateOfBirth ?? "",
    ts: Date.now(),
  });
}

export default function CheckInScreen() {
  const navigation = useNavigation<any>();

  const hook = usePatientProfile() as any;
  const profile = hook?.profile;
  const loadingProfile = hook?.loading;
  const loadProfile = hook?.reloadProfile ?? hook?.loadProfile ?? hook?.load;

  useEffect(() => {
    try {
      if (typeof loadProfile === "function") loadProfile();
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requiredComplete = useMemo(() => {
    const first = String(profile?.firstName ?? "").trim();
    const last = String(profile?.lastName ?? "").trim();
    const dob = String(profile?.dateOfBirth ?? "").trim();
    return Boolean(first && last && dob);
  }, [profile]);

  const previewLine = useMemo(() => {
    if (!profile) return "";
    const name = `${profile?.firstName ?? ""} ${profile?.lastName ?? ""}`.trim() || "—";
    const dob = profile?.dateOfBirth ? `DOB ${profile.dateOfBirth}` : "DOB —";
    const phone = profile?.phone ? ` • ${profile.phone}` : "";
    return `${name} • ${dob}${phone}`;
  }, [profile]);

  const onGeneratePdfPacket = () => {
    if (!profile) return;
    // ✅ Let CheckInConfirmScreen generate outputs (it already calls generateCheckInPdf correctly)
    navigation.navigate(MainRoutes.CHECKIN_CONFIRM, { profileData: profile });
  };

  const onGenerateQr = () => {
    if (!profile) return;
    const payload = buildMinimalQrPayload(profile);
    navigation.navigate(MainRoutes.CHECKIN_QR, { payload });
  };

  // ✅ Canonical demographics hub
  const goPatientProfile = () => navigation.navigate(MainRoutes.PATIENT_PROFILE);

  const showMissingCta = !loadingProfile && (!profile || !requiredComplete);

  return (
    <ScreenContainer
      showHeader={true}
      title="Check-In"
      headerShowLogo={false}
      headerShowAvatar={true}
      onPressAvatar={goPatientProfile}
      headerShowSettings={true}
      headerOnPressSettings={goPatientProfile}
      scroll={true}
      contentStyle={{ paddingTop: 0 }}
    >
      <SectionHeader title="Clinic check-in" />

      <Card>
        <Text style={styles.headline}>One-tap intake packet</Text>
        <Text style={styles.sub}>Generate a PDF to share/print, or a QR code for the clinic to scan.</Text>

        {loadingProfile ? (
          <Text style={styles.muted}>Loading your info…</Text>
        ) : profile ? (
          <View style={{ marginTop: theme.spacing.sm }}>
            <Text style={styles.previewLabel}>Preview</Text>
            <Text style={styles.previewText}>{previewLine}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>No patient info found yet. Add your demographics first.</Text>
        )}

        {showMissingCta ? (
          <View style={{ marginTop: theme.spacing.md }}>
            <Text style={styles.warnTitle}>Missing required demographics</Text>
            <Text style={styles.warnSub}>Add name + date of birth to generate a valid packet.</Text>
            <Button label="Complete my info" onPress={goPatientProfile} />
          </View>
        ) : (
          <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.sm }}>
            <Button label="Generate PDF packet" onPress={onGeneratePdfPacket} />
            <Button label="Generate QR code" variant="secondary" onPress={onGenerateQr} />
          </View>
        )}

        <View style={{ marginTop: theme.spacing.md }}>
          {/* ✅ FIX: This must go straight to PatientProfileScreen */}
          <Button label="Edit my demographics" variant="ghost" onPress={goPatientProfile} />
        </View>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headline: { fontSize: 16, fontWeight: "900", color: theme.colors.text },
  sub: { marginTop: 6, fontSize: 13, color: theme.colors.textSecondary, fontWeight: "700" },
  muted: { marginTop: theme.spacing.sm, color: theme.colors.textSecondary, fontWeight: "700" },

  previewLabel: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: "900" },
  previewText: { marginTop: 4, fontSize: 13, color: theme.colors.text, fontWeight: "800" },

  warnTitle: { fontSize: 13, fontWeight: "900", color: theme.colors.warning, marginBottom: 4 },
  warnSub: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, marginBottom: 10 },
});
