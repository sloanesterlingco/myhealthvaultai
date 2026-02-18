// src/features/patient/screens/CheckInConfirmScreen.tsx

import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";

import ScreenContainer from "../../../ui/ScreenContainer";
import { SectionHeader } from "../../../ui/SectionHeader";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

import { MainRoutes, MainRoutesParamList } from "../../../navigation/types";

import { generateCheckInPdf } from "../../../api/clinicalApi";

import { aiService } from "../../aiAssistant/services/aiService";
import { patientAggregationService } from "../../aiAssistant/services/patientAggregationService";
import { timelineService } from "../../medicalTimeline/services/timelineService";

/* -------------------------------------------------------------
   TYPES
------------------------------------------------------------- */

type Props = NativeStackScreenProps<MainRoutesParamList, MainRoutes.CHECKIN_CONFIRM>;

function buildCheckInPrompt(profile: any) {
  const patient = patientAggregationService.getPatient();

  return [
    "Create a concise clinic check-in packet for a patient.",
    "Output format:",
    "1) ONE-PARAGRAPH SUMMARY (plain text)",
    "2) BULLET LIST: Demographics + Insurance + Emergency Contact",
    "3) BULLET LIST: Medical History (PMH/PSH/FH/SH), Allergies, Medications (if provided)",
    "4) BULLET LIST: Missing / needs-confirmation items",
    "5) 3 QUESTIONS for the patient to confirm at intake",
    "",
    "Patient profile data (from the app):",
    JSON.stringify(profile ?? {}, null, 2),
    "",
    "Aggregated patient model (may be partially filled):",
    JSON.stringify(patient ?? {}, null, 2),
    "",
    "Be privacy-conscious and avoid speculation.",
  ].join("\n");
}

function firstEmergencyContact(profileData: any) {
  const list = Array.isArray(profileData?.emergencyContacts) ? profileData.emergencyContacts : [];
  return list.length ? list[0] : null;
}

export default function CheckInConfirmScreen({ route, navigation }: Props) {
  const { profileData } = route.params as any;
  const initialPacket = (route.params as any)?.aiCheckInPacket as string | undefined;

  const [sending, setSending] = useState(false);
  const [aiPacket, setAiPacket] = useState<string>(initialPacket ?? "");
  const [aiLoading, setAiLoading] = useState(false);

  const checkInDateTime = useMemo(() => new Date().toISOString(), []);
  const ec = useMemo(() => firstEmergencyContact(profileData), [profileData]);

  // ✅ NEW source of truth for "card on file" (stored on patient profile doc)
  const hasInsuranceCardOnFile = useMemo(() => {
    const front = String(profileData?.insuranceCardFrontUrl ?? "").trim();
    const back = String(profileData?.insuranceCardBackUrl ?? "").trim();
    return Boolean(front || back);
  }, [profileData]);

  /* -------------------------------------------------------------
     AI ACTIONS
  ------------------------------------------------------------- */

  const onCopyAIPacket = async () => {
    if (!aiPacket?.trim()) {
      Alert.alert("Nothing to copy", "Generate the packet first.");
      return;
    }
    await Clipboard.setStringAsync(aiPacket);
    Alert.alert("Copied", "Check-in packet copied to clipboard.");
  };

  const onGenerateAIPacket = async () => {
    try {
      setAiLoading(true);

      // Keep EMR synced with latest profile at confirm time too
      patientAggregationService.updatePatientData({
        demographics: {
          firstName: profileData?.firstName ?? "",
          lastName: profileData?.lastName ?? "",
          dateOfBirth: profileData?.dateOfBirth ?? "",
          gender: profileData?.gender ?? "",
          phone: profileData?.phone ?? "",
          address: profileData?.address ?? "",
          city: profileData?.city ?? "",
          state: profileData?.state ?? "",
          zip: profileData?.zip ?? "",
          email: profileData?.email ?? "",
          insuranceProvider: profileData?.insuranceProvider ?? "",
          memberId: profileData?.memberId ?? "",
          groupNumber: profileData?.groupNumber ?? "",
          insurancePhone: profileData?.insurancePhone ?? "",
          // Optional: card urls if present (keeps aggregation future-proof)
          insuranceCardFrontUrl: profileData?.insuranceCardFrontUrl ?? "",
          insuranceCardBackUrl: profileData?.insuranceCardBackUrl ?? "",
        } as any,
      });

      const text = await aiService.sendMessage({
        messages: [{ role: "user", content: buildCheckInPrompt(profileData) }],
      });

      setAiPacket(text);
    } catch (err) {
      console.error("AI check-in packet error:", err);
      Alert.alert("Error", "Could not generate the check-in packet.");
    } finally {
      setAiLoading(false);
    }
  };

  /* -------------------------------------------------------------
     GENERATE OUTPUTS (PDF + QR)
  ------------------------------------------------------------- */

  const onGenerateOutputs = async () => {
    try {
      setSending(true);

      const pdfResponse = await generateCheckInPdf({
        profile: profileData,
        chiefComplaint: aiPacket ?? "",
        clinicName: "MyHealthVaultAI",
        checkInDateTime,
      });

      const pdfUrl = pdfResponse?.publicUrl ?? null;

      // Timeline breadcrumb (best-effort)
      try {
        await timelineService.addEvent({
          type: "CHECKIN",
          category: "exports",
          summary: "Clinic check-in packet generated",
          detail: pdfUrl ? `PDF: ${pdfUrl}` : "PDF generated.",
          level: "low",
          timestamp: Date.now(),
          meta: { source: "checkin_flow", pdfUrl },
        } as any);
      } catch {
        // no-op alpha
      }

      const qrPayload = JSON.stringify({
        cid: profileData.uid,
        ts: Date.now(),
        type: "checkin",
      });

      navigation.navigate(MainRoutes.CHECKIN_SUCCESS, {
        qrPayload,
        pdfUri: pdfUrl,
      });
    } catch (err) {
      console.error("Check-in error:", err);
      Alert.alert("Error", "Unable to complete check-in.");
    } finally {
      setSending(false);
    }
  };

  /* -------------------------------------------------------------
     DISPLAY
  ------------------------------------------------------------- */

  return (
    <ScreenContainer
      showHeader={true}
      title="Check-In"
      headerShowLogo={false}
      headerShowAvatar={true}
      // ✅ Avatar tap = edit demographics (single source of truth)
      onPressAvatar={() => navigation.navigate(MainRoutes.DEMOGRAPHICS_INTRO as any)}
      scroll={true}
      contentStyle={{ paddingTop: 0 }}
    >
      <SectionHeader title="Review Your Information" />

      <Card>
        <Text style={styles.title}>Patient</Text>
        <Text>
          {profileData.firstName} {profileData.lastName}
        </Text>
        <Text>DOB: {profileData.dateOfBirth || "—"}</Text>
        {profileData.phone ? <Text>Phone: {profileData.phone}</Text> : null}

        <Button
          label="Edit demographics"
          variant="ghost"
          onPress={() => navigation.navigate(MainRoutes.DEMOGRAPHICS_INTRO as any)}
          style={{ marginTop: theme.spacing.sm }}
        />
      </Card>

      <Card>
        <Text style={styles.title}>Emergency Contact</Text>
        {ec ? (
          <>
            <Text>{ec.name || "—"}</Text>
            {ec.relationship ? <Text>{ec.relationship}</Text> : null}
            {ec.phone ? <Text>{ec.phone}</Text> : null}
          </>
        ) : (
          <Text style={styles.muted}>Not provided</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.title}>Insurance</Text>
        <Text>{profileData.insuranceProvider || "Cash / HSA / FSA"}</Text>
        {profileData.memberId ? <Text>Member ID: {profileData.memberId}</Text> : null}
        {profileData.groupNumber ? <Text>Group: {profileData.groupNumber}</Text> : null}
        {profileData.insurancePhone ? <Text>Phone: {profileData.insurancePhone}</Text> : null}

        <Text style={[styles.muted, { marginTop: theme.spacing.sm }]}>
          Card on file: {hasInsuranceCardOnFile ? "Yes" : "No"}
        </Text>
      </Card>

      <SectionHeader title="AI Check-In Packet" />

      <Card>
        {aiPacket?.trim() ? (
          <Text style={styles.aiText}>{aiPacket}</Text>
        ) : (
          <Text style={styles.aiPlaceholder}>
            No packet yet. Tap “Generate packet” to create a front-desk friendly summary.
          </Text>
        )}

        <View style={{ height: theme.spacing.md }} />

        <Button
          label={
            aiLoading
              ? "Generating..."
              : aiPacket?.trim()
              ? "Regenerate packet"
              : "Generate packet"
          }
          onPress={onGenerateAIPacket}
          loading={aiLoading}
          disabled={aiLoading || sending}
          style={{ marginBottom: theme.spacing.sm }}
        />

        <Button
          label="Copy packet"
          onPress={onCopyAIPacket}
          disabled={!aiPacket?.trim() || aiLoading || sending}
        />
      </Card>

      <View style={{ height: theme.spacing.md }} />

      <Button
        label={sending ? "Generating..." : "Generate PDF + QR"}
        onPress={onGenerateOutputs}
        disabled={sending || aiLoading}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontWeight: theme.typography.weights.bold,
    fontSize: 17,
    marginBottom: theme.spacing.xs,
    color: theme.colors.text,
  },
  aiText: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  aiPlaceholder: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  muted: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
});
