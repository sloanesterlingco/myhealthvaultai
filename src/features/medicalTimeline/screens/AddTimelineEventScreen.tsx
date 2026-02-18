// src/features/medicalTimeline/screens/AddTimelineEventScreen.tsx
import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Input } from "../../../ui/Input";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

import { timelineService } from "../services/timelineService";
import type { TimelineCategory, TimelineEventType } from "../services/timelineTypes";

function normalizeType(raw: string): TimelineEventType {
  const t = (raw || "").trim().toUpperCase();
  if (t === "AI_NOTE") return "AI_NOTE";
  if (t === "SAFETY_ALERT") return "SAFETY_ALERT";
  if (t === "VITAL") return "VITAL";
  return "GENERAL";
}

function normalizeCategory(raw: string): TimelineCategory {
  const c = (raw || "").trim().toLowerCase();
  if (c === "records" || c === "record") return "records";
  if (c === "vitals" || c === "vital") return "vitals";
  if (c === "meds" || c === "medications" || c === "medication") return "medications";
  if (c === "labs" || c === "lab") return "labs";
  if (c === "imaging" || c === "images" || c === "radiology") return "imaging";
  if (c === "visits" || c === "visit" || c === "ai") return "visits";
  if (c === "insurance" || c === "card") return "insurance";
  if (c === "exports" || c === "export" || c === "pdf" || c === "qr") return "exports";
  if (c === "warnings" || c === "warning" || c === "alerts" || c === "alert") return "warnings";
  return "other";
}

function formatMdy(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function toYmd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AddTimelineEventScreen() {
  const navigation = useNavigation<any>();

  const [type, setType] = useState<TimelineEventType>("GENERAL");
  const [category, setCategory] = useState<TimelineCategory>("records");

  // ✅ Real Date object, default = today
  const [dateObj, setDateObj] = useState<Date>(new Date());

  // Picker visibility
  const [showPicker, setShowPicker] = useState(false);

  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(() => summary.trim().length > 0, [summary]);

  const onOpenPicker = () => setShowPicker(true);

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    // Android: picker closes after selection/cancel
    if (Platform.OS === "android") setShowPicker(false);
    if (selected) setDateObj(selected);
  };

  const handleSave = async () => {
    if (!canSave || saving) return;

    try {
      setSaving(true);
      const now = Date.now();

      await timelineService.addEvent({
        type,
        category,
        summary: summary.trim(),
        detail: detail.trim() ? detail.trim() : undefined,
        notes: notes.trim() ? notes.trim() : null,

        // ✅ Store as ISO date string for stable sorting
        date: toYmd(dateObj),

        level: "low",
        timestamp: now,
      } as any);

      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "The timeline event could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer
      showHeader
      title="Add Timeline Event"
      canGoBack
      onPressBack={() => navigation.goBack()}
      // This screen is form-based; we want ScreenContainer ScrollView behavior
      scroll
      showAvatar={false}
    >
      <Card>
        <Text style={styles.helper}>
          Types: <Text style={styles.helperStrong}>GENERAL</Text>,{" "}
          <Text style={styles.helperStrong}>AI_NOTE</Text>,{" "}
          <Text style={styles.helperStrong}>SAFETY_ALERT</Text>,{" "}
          <Text style={styles.helperStrong}>VITAL</Text>
        </Text>

        <Text style={styles.helper}>
          Categories: <Text style={styles.helperStrong}>records</Text>,{" "}
          <Text style={styles.helperStrong}>vitals</Text>,{" "}
          <Text style={styles.helperStrong}>medications</Text>,{" "}
          <Text style={styles.helperStrong}>labs</Text>,{" "}
          <Text style={styles.helperStrong}>imaging</Text>,{" "}
          <Text style={styles.helperStrong}>visits</Text>,{" "}
          <Text style={styles.helperStrong}>insurance</Text>,{" "}
          <Text style={styles.helperStrong}>exports</Text>
        </Text>

        <Input
          label="Type"
          value={type}
          onChangeText={(v) => setType(normalizeType(v))}
          placeholder="GENERAL / AI_NOTE / SAFETY_ALERT / VITAL"
          autoCapitalize="characters"
        />

        <Input
          label="Category"
          value={category}
          onChangeText={(v) => setCategory(normalizeCategory(v))}
          placeholder="records / vitals / medications / labs / imaging / visits / insurance / exports"
          autoCapitalize="none"
        />

        {/* ✅ Date picker field */}
        <Text style={styles.label}>Date</Text>
        <Pressable onPress={onOpenPicker} style={styles.dateField}>
          <Text style={styles.dateValue}>{formatMdy(dateObj)}</Text>
          <Text style={styles.dateHint}>Tap to change</Text>
        </Pressable>

        {showPicker && (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={dateObj}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={onDateChange}
            />
            {Platform.OS === "ios" && (
              <View style={{ marginTop: theme.spacing.sm }}>
                <Button label="Done" onPress={() => setShowPicker(false)} variant="secondary" />
              </View>
            )}
          </View>
        )}

        <Input
          label="Summary"
          value={summary}
          onChangeText={setSummary}
          placeholder="Short headline (required)"
        />

        <Input
          label="Detail (optional)"
          value={detail}
          onChangeText={setDetail}
          placeholder="More context"
          multiline
          style={{ height: 110 }}
        />

        <Input
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Private notes"
          multiline
          style={{ height: 90 }}
        />

        <View style={styles.buttonRow}>
          <Button
            label="Cancel"
            onPress={() => navigation.goBack()}
            variant="secondary"
            style={{ flex: 1 }}
          />
          <View style={{ width: theme.spacing.sm }} />
          <Button
            label={saving ? "Saving..." : "Save"}
            onPress={handleSave}
            disabled={!canSave || saving}
            style={{ flex: 1 }}
          />
        </View>

        {!canSave && <Text style={styles.validation}>Summary is required.</Text>}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  helper: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: theme.spacing.md,
  },
  helperStrong: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  label: {
    marginTop: theme.spacing.sm,
    marginBottom: 6,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  dateField: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.card,
    marginBottom: theme.spacing.md,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.text,
  },
  dateHint: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  pickerWrap: {
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.md,
  },
  validation: {
    marginTop: theme.spacing.sm,
    color: theme.colors.warning,
    fontSize: 12,
  },
});
