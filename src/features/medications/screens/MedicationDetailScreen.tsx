// src/features/medications/screens/MedicationDetailScreen.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";

import {
  LabSnapshot,
  MedicationForRisk,
  MedicationRiskResult,
  PatientSnapshot,
  VitalSnapshot,
} from "../services/types";
import { evaluateMedicationRisk } from "../services/medicationRiskEngine";
import { MainRoutes, MainRoutesParamList } from "../../../navigation/types";
import { useDashboard } from "../../patient/hooks/useDashboard";
import { vitalsService } from "../../vitals/services/vitalsService";
import { VitalRecord } from "../../vitals/types";
import { theme } from "../../../theme";

import { patientService } from "../../../services/patientService";
import {
  cancelMedicationReminder,
  formatHourMinute,
  getStoredMedicationReminder,
  scheduleDailyMedicationReminder,
} from "../../../services/notificationService";

type Props = NativeStackScreenProps<
  MainRoutesParamList,
  MainRoutes.MEDICATION_DETAIL
>;

/** Convert VitalRecord[] -> VitalSnapshot[] */
function toVitalSnapshots(records: VitalRecord[]): VitalSnapshot[] {
  const snapshots: VitalSnapshot[] = [];

  records.forEach((r) => {
    if (r.type === "bp") {
      if (r.systolic != null) {
        snapshots.push({
          type: "systolic_bp",
          value: Number(r.systolic),
          unit: "mmHg",
          recordedAt: r.timestampMs,
        });
      }
      if (r.diastolic != null) {
        snapshots.push({
          type: "diastolic_bp",
          value: Number(r.diastolic),
          unit: "mmHg",
          recordedAt: r.timestampMs,
        });
      }
    } else if (r.type === "hr" && r.value != null) {
      snapshots.push({
        type: "heart_rate",
        value: Number(r.value),
        unit: "bpm",
        recordedAt: r.timestampMs,
      });
    }
  });

  return snapshots;
}

/** Build PatientSnapshot from dashboard patient + conditions */
function buildPatientSnapshot(
  patient: any,
  conditions: any[] | null | undefined
): PatientSnapshot {
  let age = 0;
  if (patient?.dateOfBirth) {
    const dob = new Date(patient.dateOfBirth);
    const now = new Date();
    age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  }

  let sex: PatientSnapshot["sex"] = "unknown";
  if (patient?.sexAtBirth === "male") sex = "male";
  else if (patient?.sexAtBirth === "female") sex = "female";
  else if (patient?.sexAtBirth) sex = "other";

  const conditionNames =
    conditions?.map((c: any) => c?.name).filter(Boolean) ?? [];

  return {
    id: patient?.id ?? "current-patient",
    age,
    sex,
    conditions: conditionNames,
  };
}

export const MedicationDetailScreen: React.FC<Props> = ({ route }) => {
  const rawMedication = (route as any)?.params?.medication ?? {};

  const medicationId: string =
    rawMedication.id ?? rawMedication.medicationId ?? "unknown-med";

  const medication: MedicationForRisk = {
    id: medicationId,
    name: rawMedication.name ?? rawMedication.displayName ?? "Medication",
    genericName:
      (rawMedication.genericName as string) ??
      (rawMedication.name as string)?.toLowerCase() ??
      "unknown",
    doseMgPerDay: rawMedication.doseMgPerDay,
  };

  const { patient, conditions } = useDashboard();

  const [latestVitals, setLatestVitals] = useState<VitalSnapshot[]>([]);
  const [latestLabs] = useState<LabSnapshot[]>([]); // reserved for future wiring

  // -------------------------
  // Reminder UI state
  // -------------------------
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [statusText, setStatusText] = useState<string>("Off");

  // Prevent double taps while scheduling/canceling
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadVitals = async () => {
      try {
        const records = (await vitalsService.getAllVitals()) as VitalRecord[];
        if (!mounted) return;
        setLatestVitals(toVitalSnapshots(records));
      } catch (err) {
        console.warn("Failed to load vitals for medication risk", err);
      }
    };

    loadVitals();

    return () => {
      mounted = false;
    };
  }, []);

  // Hydrate reminder from AsyncStorage (source of truth for schedule id)
  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      try {
        const stored = await getStoredMedicationReminder(medicationId);
        if (!mounted) return;

        if (stored) {
          const d = new Date();
          d.setHours(stored.hour, stored.minute, 0, 0);

          setReminderEnabled(true);
          setReminderTime(d);
          setStatusText(
            `Daily at ${formatHourMinute(stored.hour, stored.minute)}`
          );
        } else {
          setReminderEnabled(false);
          setStatusText("Off");
        }
      } catch {
        // If storage read fails, be safe: show Off
        setReminderEnabled(false);
        setStatusText("Off");
      }
    };

    hydrate();

    return () => {
      mounted = false;
    };
  }, [medicationId]);

  const patientSnapshot: PatientSnapshot = useMemo(() => {
    if (!patient) {
      return { id: "current-patient", age: 0, sex: "unknown", conditions: [] };
    }
    return buildPatientSnapshot(patient, conditions);
  }, [patient, conditions]);

  const risk: MedicationRiskResult = useMemo(() => {
    return evaluateMedicationRisk({
      medication,
      patient: patientSnapshot,
      latestVitals,
      latestLabs,
    });
  }, [medication, patientSnapshot, latestVitals, latestLabs]);

  const openTimePicker = () => setShowTimePicker(true);

  const onPickTime = async (event: any, date?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (!date) return;

    // Save previous state so we can revert if reschedule fails
    const prevTime = reminderTime;

    const d = new Date(date);
    d.setSeconds(0, 0);
    setReminderTime(d);

    if (!reminderEnabled) return;
    if (busy) return;

    setBusy(true);
    try {
      const hour = d.getHours();
      const minute = d.getMinutes();

      const cfg = await scheduleDailyMedicationReminder({
        medicationId,
        title: "Medication Reminder",
        body: `Time to take ${medication.name}`,
        hour,
        minute,
      });

      // Firestore update is nice-to-have; don't break UX if it fails
      try {
        await patientService.updateMedication(medicationId, {
          reminderEnabled: true,
          reminderTime: formatHourMinute(cfg.hour, cfg.minute),
          reminderUpdatedAt: new Date().toISOString(),
        } as any);
      } catch (e) {
        console.warn("Reminder Firestore update failed (time change)", e);
      }

      setStatusText(`Daily at ${formatHourMinute(cfg.hour, cfg.minute)}`);
    } catch (e: any) {
      console.warn("Failed to reschedule reminder", e);

      // Revert UI to previous time (avoid stuck state)
      setReminderTime(prevTime);

      Alert.alert(
        "Reminder not updated",
        e?.message ?? "Could not update reminder time."
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleReminder = async (next: boolean) => {
    if (busy) return;
    setBusy(true);

    if (next) {
      // Turning ON: only keep ON if scheduling succeeds
      setReminderEnabled(true);
      setStatusText(
        `Daily at ${formatHourMinute(
          reminderTime.getHours(),
          reminderTime.getMinutes()
        )}`
      );

      try {
        const hour = reminderTime.getHours();
        const minute = reminderTime.getMinutes();

        const cfg = await scheduleDailyMedicationReminder({
          medicationId,
          title: "Medication Reminder",
          body: `Time to take ${medication.name}`,
          hour,
          minute,
        });

        // Best-effort Firestore update
        try {
          await patientService.updateMedication(medicationId, {
            reminderEnabled: true,
            reminderTime: formatHourMinute(cfg.hour, cfg.minute),
            reminderUpdatedAt: new Date().toISOString(),
          } as any);
        } catch (e) {
          console.warn("Reminder Firestore update failed (enable)", e);
        }

        setStatusText(`Daily at ${formatHourMinute(cfg.hour, cfg.minute)}`);
      } catch (e: any) {
        console.warn("Enable reminder failed", e);

        // Revert UI
        setReminderEnabled(false);
        setStatusText("Off");

        Alert.alert(
          "Could not enable reminders",
          e?.message ?? "Please allow notifications in system settings."
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    // Turning OFF: MUST be safe and instant
    setReminderEnabled(false);
    setStatusText("Off");

    try {
      // cancelMedicationReminder is already safe (never throws)
      await cancelMedicationReminder(medicationId);

      // Best-effort Firestore update (never block OFF)
      try {
        await patientService.updateMedication(medicationId, {
          reminderEnabled: false,
          reminderTime: null,
          reminderUpdatedAt: new Date().toISOString(),
        } as any);
      } catch (e) {
        console.warn("Reminder Firestore update failed (disable)", e);
      }
    } catch (e) {
      // Never show an error for turning OFF
      console.warn("Disable reminder encountered an issue (ignored)", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{medication.name}</Text>
          <Text style={styles.subtitle}>
            {medication.genericName?.toLowerCase()}
          </Text>
        </View>

        <View style={styles.riskBlock}>
          <View style={[styles.riskBadge, riskBadgeStyle(risk.level)]} />
          <Text style={styles.riskLabel}>
            {risk.level === "green"
              ? "Low concern"
              : risk.level === "yellow"
              ? "Moderate concern"
              : "High concern"}
          </Text>
        </View>
      </View>

      {/* ✅ Reminder Section */}
      <View style={styles.sectionCard}>
        <View style={styles.reminderHeaderRow}>
          <Text style={styles.sectionTitle}>Medication reminder</Text>
          <Switch
            value={reminderEnabled}
            onValueChange={toggleReminder}
            disabled={busy}
          />
        </View>

        <Text style={styles.sectionBodySecondary}>
          {reminderEnabled ? statusText : "Off"}
        </Text>

        {/* Banner */}
        {reminderEnabled ? (
          <View style={styles.banner}>
            <Text style={styles.bannerTitle}>Manual entry recommended</Text>
            <Text style={styles.bannerBody}>
              Reminders are set on this device only. If you reinstall the app or
              switch phones, you’ll need to re-enable them.
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.timeButton,
            (!reminderEnabled || busy) && styles.timeButtonDisabled,
          ]}
          onPress={openTimePicker}
          disabled={!reminderEnabled || busy}
        >
          <Text style={styles.timeButtonText}>
            Set time:{" "}
            {formatHourMinute(
              reminderTime.getHours(),
              reminderTime.getMinutes()
            )}
          </Text>
        </TouchableOpacity>

        {showTimePicker && (
          <DateTimePicker
            value={reminderTime}
            mode="time"
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onPickTime}
          />
        )}
      </View>

      {/* Risk summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Risk summary</Text>
        <Text style={styles.sectionBody}>{risk.summary}</Text>
        {risk.detail ? (
          <Text style={styles.sectionBodySecondary}>{risk.detail}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Things to monitor</Text>
        {(risk.suggestions ?? []).map((s: string, idx: number) => (
          <Text key={`${idx}_${s}`} style={styles.bulletItem}>
            • {s}
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent vitals</Text>
        {latestVitals.length === 0 ? (
          <Text style={styles.sectionBodySecondary}>
            No recent vitals available.
          </Text>
        ) : (
          latestVitals.map((v) => (
            <Text key={`${v.type}_${v.recordedAt}`} style={styles.bulletItem}>
              • {v.type.replace(/_/g, " ")}: {v.value} {v.unit}
            </Text>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent labs</Text>
        {latestLabs.length === 0 ? (
          <Text style={styles.sectionBodySecondary}>
            No recent labs available.
          </Text>
        ) : (
          latestLabs.map((l) => (
            <Text key={`${l.type}_${l.recordedAt}`} style={styles.bulletItem}>
              • {String(l.type).toUpperCase()}: {l.value} {l.unit}
            </Text>
          ))
        )}
      </View>
    </ScrollView>
  );
};

function riskBadgeStyle(level: "green" | "yellow" | "red") {
  switch (level) {
    case "green":
      return { backgroundColor: "#22c55e" };
    case "yellow":
      return { backgroundColor: "#eab308" };
    case "red":
    default:
      return { backgroundColor: "#ef4444" };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  titleBlock: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  riskBlock: {
    alignItems: "flex-end",
  },
  riskBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  riskLabel: {
    fontSize: 12,
    color: "#374151",
  },

  section: {
    marginTop: 16,
  },
  sectionCard: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionBody: {
    fontSize: 14,
    color: "#111827",
  },
  sectionBodySecondary: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
  bulletItem: {
    fontSize: 14,
    color: "#111827",
    marginTop: 2,
  },

  reminderHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fff",
  },
  timeButtonDisabled: {
    opacity: 0.5,
  },
  timeButtonText: {
    fontWeight: "800",
    color: "#111827",
  },

  banner: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    borderWidth: 1,
    borderColor: "#c7d2fe",
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#3730a3",
  },
  bannerBody: {
    marginTop: 6,
    fontSize: 12,
    color: "#3730a3",
    lineHeight: 16,
    fontWeight: "700",
  },
});

export default MedicationDetailScreen;
