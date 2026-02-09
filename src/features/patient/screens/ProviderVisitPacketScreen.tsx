// src/features/patient/screens/ProviderVisitPacketScreen.tsx

import React from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import { useDashboard } from "../hooks/useDashboard";
import { useHPI } from "../../hpi/hooks/useHPI";
import { useHPINarrative } from "../../hpi/hooks/useHPINarrative";

/**
 * iOS-style Provider Visit Packet
 * Sections included:
 * - Patient Info
 * - Conditions
 * - AI HPI Narrative
 * - Vitals Summary
 * - Medications (full block per med)
 * - Symptoms Summary
 * - Provider Notes
 *
 * NOTE: This version intentionally does NOT call any PDF/FHIR
 * services to avoid type/signature conflicts. We can wire those
 * back in once the core UI is stable.
 */

const ProviderVisitPacketScreen: React.FC = () => {
  const { patient, conditions } = useDashboard();
  const { hpi } = useHPI();
  const { narrative } = useHPINarrative(hpi);

  // ---------- Small UI helpers ----------

  const Card: React.FC<{ title: string; children: React.ReactNode }> = ({
    title,
    children,
  }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );

  const Row: React.FC<{ label: string; value: string }> = ({
    label,
    value,
  }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );

  const Separator = () => <View style={styles.separator} />;

  // ---------- Data helpers ----------

  const vitals = (patient && (patient.vitals || patient.latestVitals)) || null;

  const medications: any[] =
    (patient && (patient.medications || patient.meds)) || [];

  const buildSymptomsSummary = (): string => {
    const parts: string[] = [];

    if (Array.isArray(hpi.associatedSymptoms) && hpi.associatedSymptoms.length) {
      parts.push(`Associated: ${hpi.associatedSymptoms.join(", ")}`);
    }

    if (
      Array.isArray(hpi.characterDescription) &&
      hpi.characterDescription.length
    ) {
      parts.push(`Character: ${hpi.characterDescription.join(", ")}`);
    }

    if (Array.isArray(hpi.impactOnLife) && hpi.impactOnLife.length) {
      parts.push(`Impact: ${hpi.impactOnLife.join(", ")}`);
    }

    if (
      Array.isArray(hpi.functionalLimitations) &&
      hpi.functionalLimitations.length
    ) {
      parts.push(`Limitations: ${hpi.functionalLimitations.join(", ")}`);
    }

    return parts.length
      ? parts.join("   •   ")
      : "No symptom details captured.";
  };

  const providerNotes: string =
    patient?.providerNotes ||
    patient?.lastVisitNotes ||
    "No provider notes added yet.";

  // ---------- Render ----------

  if (!patient) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading visit data...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* PATIENT INFO */}
      <Card title="Patient Information">
        <Row
          label="Name"
          value={
            patient.name ||
            `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim() ||
            "—"
          }
        />
        <Separator />
        <Row
          label="Date of Birth"
          value={patient.dob || patient.dateOfBirth || "—"}
        />
        <Separator />
        <Row label="Phone" value={patient.phone || "—"} />
        <Separator />
        <Row label="Email" value={patient.email || "—"} />
      </Card>

      {/* CONDITIONS */}
      <Card title="Conditions">
        {Array.isArray(conditions) && conditions.length > 0 ? (
          conditions.map((c: any, idx: number) => (
            <View key={c.id ?? c.name ?? idx} style={styles.listItem}>
              <Text style={styles.listBullet}>•</Text>
              <View style={styles.listContent}>
                <Text style={styles.listPrimary}>{c.name ?? "Condition"}</Text>
                {c.status && (
                  <Text style={styles.listSecondary}>
                    Status: {c.status.toString()}
                  </Text>
                )}
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No conditions recorded.</Text>
        )}
      </Card>

      {/* AI HPI NARRATIVE */}
      <Card title="AI HPI Narrative">
        <Text style={styles.bodyText}>
          {narrative || hpi.narrative || "No HPI narrative generated yet."}
        </Text>
      </Card>

      {/* VITALS SUMMARY */}
      <Card title="Vitals Summary">
        {vitals ? (
          <>
            <Row
              label="Blood Pressure"
              value={
                vitals.bp ||
                vitals.bloodPressure ||
                vitals.blood_pressure ||
                "—"
              }
            />
            <Separator />
            <Row
              label="Heart Rate"
              value={
                vitals.heartRate != null
                  ? `${vitals.heartRate} bpm`
                  : vitals.hr != null
                  ? `${vitals.hr} bpm`
                  : "—"
              }
            />
            <Separator />
            <Row
              label="SpO₂"
              value={
                vitals.spo2 != null
                  ? `${vitals.spo2}%`
                  : vitals.oxygen != null
                  ? `${vitals.oxygen}%`
                  : "—"
              }
            />
            <Separator />
            <Row
              label="Temperature"
              value={
                vitals.temperature != null
                  ? `${vitals.temperature} °F`
                  : vitals.temp != null
                  ? `${vitals.temp} °F`
                  : "—"
              }
            />
            <Separator />
            <Row
              label="Weight"
              value={
                vitals.weight != null
                  ? `${vitals.weight} lbs`
                  : vitals.wt != null
                  ? `${vitals.wt} lbs`
                  : "—"
              }
            />
            <Separator />
            <Row
              label="Glucose"
              value={
                vitals.glucose != null
                  ? `${vitals.glucose} mg/dL`
                  : vitals.bg != null
                  ? `${vitals.bg} mg/dL`
                  : "—"
              }
            />
          </>
        ) : (
          <Text style={styles.emptyText}>No vitals available.</Text>
        )}
      </Card>

      {/* MEDICATIONS */}
      <Card title="Medications">
        {Array.isArray(medications) && medications.length > 0 ? (
          medications.map((m: any, idx: number) => {
            const key = m.id ?? m.name ?? m.genericName ?? idx;
            const name = m.name || m.genericName || "Medication";
            const dose = m.dose || m.dosage || "";
            const frequency = m.frequency || m.freq || "";
            const route = m.route || "";
            const startDate = m.startDate || m.startedOn || "";

            return (
              <View key={key} style={styles.medBlock}>
                <Text style={styles.medName}>{name}</Text>
                {dose !== "" && (
                  <Text style={styles.medLine}>Dose: {dose}</Text>
                )}
                {frequency !== "" && (
                  <Text style={styles.medLine}>Frequency: {frequency}</Text>
                )}
                {route !== "" && (
                  <Text style={styles.medLine}>Route: {route}</Text>
                )}
                {startDate !== "" && (
                  <Text style={styles.medLine}>Started: {startDate}</Text>
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No medications on file.</Text>
        )}
      </Card>

      {/* SYMPTOMS SUMMARY */}
      <Card title="Symptoms Summary">
        <Text style={styles.bodyText}>{buildSymptomsSummary()}</Text>
      </Card>

      {/* PROVIDER NOTES */}
      <Card title="Provider Notes">
        <Text style={styles.bodyText}>{providerNotes}</Text>
      </Card>

      {/* Placeholder for future export buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => {
            // We will wire this to FHIR/PDF later
            console.log("Export visit packet (to be implemented)");
          }}
        >
          <Text style={styles.exportButtonLabel}>Export Visit Packet</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

export default ProviderVisitPacketScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F6F8",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F6F8",
  },
  loadingText: {
    color: "#6B7280",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  cardBody: {
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  rowValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
    marginLeft: 12,
    flexShrink: 1,
    textAlign: "right",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
    marginVertical: 2,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 4,
  },
  listBullet: {
    fontSize: 16,
    marginRight: 6,
    color: "#4B5563",
    marginTop: 1,
  },
  listContent: {
    flex: 1,
  },
  listPrimary: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  listSecondary: {
    fontSize: 13,
    color: "#6B7280",
  },
  bodyText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  medBlock: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  medName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  medLine: {
    fontSize: 13,
    color: "#4B5563",
  },
  actions: {
    marginTop: 8,
  },
  exportButton: {
    backgroundColor: "#0A7AFF",
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  exportButtonLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
