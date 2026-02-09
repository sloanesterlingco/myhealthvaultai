// src/features/vitals/screens/AddVitalScreen.tsx

import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";

// ✅ FIX: ScreenContainer is DEFAULT export
import ScreenContainer from "../../../ui/ScreenContainer";

import { Input } from "../../../ui/Input";
import { Button } from "../../../ui/Button";
import { theme } from "../../../theme";

import { useAddVital } from "../hooks/useAddVital";
import { MainRoutes, MainRoutesParamList } from "../../../navigation/types";
import type { VitalType } from "../types";

type RouteProps = RouteProp<MainRoutesParamList, MainRoutes.ADD_VITAL>;

function fallbackLabelForType(type: VitalType) {
  switch (type) {
    case "bp":
      return "Blood Pressure";
    case "hr":
      return "Heart Rate";
    case "spo2":
      return "Blood Oxygen";
    case "rr":
      return "Respiratory Rate";
    case "temp":
      return "Temperature";
    case "weight":
      return "Weight";
    case "height":
      return "Height (in)";
    default:
      return "Vital";
  }
}

function valueLabelForType(type: VitalType) {
  switch (type) {
    case "hr":
      return "Heart Rate (bpm)";
    case "spo2":
      return "Blood Oxygen (%)";
    case "rr":
      return "Respiratory Rate (breaths/min)";
    case "temp":
      return "Temperature (°F)";
    case "weight":
      return "Weight (lbs)";
    case "height":
      return "Height (inches)";
    default:
      return "Value";
  }
}

function formatMdy(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export default function AddVitalScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProps>();

  const params = route.params as undefined | { type: VitalType; label?: string };
  const type: VitalType | null = params?.type ?? null;

  const label = useMemo(() => {
    if (!type) return "Vital";
    return (params?.label?.trim() ? params.label : fallbackLabelForType(type)) as string;
  }, [params?.label, type]);

  const valueLabel = useMemo(() => {
    if (!type) return "Value";
    return valueLabelForType(type);
  }, [type]);

  // ✅ Date picker state
  const [dateObj, setDateObj] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const {
    value,
    setValue,
    systolic,
    setSystolic,
    diastolic,
    setDiastolic,
    notes,
    setNotes,
    loading,
    saveVital,
  } = useAddVital((type ?? "hr") as VitalType, {
    selectedDate: dateObj,
    normalizeSelectedDateToMidday: true,
  });

  const goToVitalsHome = () => {
    navigation.navigate(MainRoutes.VITALS_TAB as any, { screen: MainRoutes.VITALS });
  };

  const goToProfile = () => {
    navigation.navigate(MainRoutes.DASHBOARD_TAB as any, { screen: MainRoutes.DEMOGRAPHICS_INTRO });
  };

  const onBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else goToVitalsHome();
  };

  const onSave = async () => {
    try {
      const ok = await saveVital();
      if (!ok) {
        Alert.alert("Save failed", "We couldn’t save that vital. Please try again.");
        return;
      }
      onBack();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "We couldn’t save that vital. Please try again.");
    }
  };

  const onOpenPicker = () => setShowPicker(true);

  ;

  const onChangeDate = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (selected) setDateObj(selected);
  };

  const onClosePickerIOS = () => setShowPicker(false);

  if (!type) {
    return (
      <ScreenContainer
        showHeader
        title="Add Vital"
        headerCanGoBack
        headerShowLogo={false}
        headerShowAvatar
        onPressBack={onBack}
        onPressAvatar={goToProfile}
        scroll
        contentStyle={{ paddingTop: 0 }}
      >
        <Text style={styles.error}>Missing vital type.</Text>

        <Button
          label="Back to Vitals"
          onPress={goToVitalsHome}
          style={{ marginTop: theme.spacing.lg }}
        />
      </ScreenContainer>
    );
  }

  const isBP = type === "bp";

  return (
    <ScreenContainer
      showHeader
      title={`Add ${label}`}
      headerCanGoBack
      headerShowLogo={false}
      headerShowAvatar
      onPressBack={onBack}
      onPressAvatar={goToProfile}
      scroll
      contentStyle={{ paddingTop: 0 }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Add {label}</Text>

          <Text style={styles.sectionLabel}>Date</Text>
          <Pressable onPress={onOpenPicker} style={styles.dateRow}>
            <Text style={styles.dateText}>{formatMdy(dateObj)}</Text>
            <Text style={styles.dateHint}>Tap to change</Text>
          </Pressable>

          {showPicker ? (
            <View style={{ marginBottom: theme.spacing.md }}>
              <DateTimePicker
                value={dateObj}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onChangeDate}
              />
              {Platform.OS === "ios" ? (
                <Button label="Done" variant="secondary" onPress={onClosePickerIOS} />
              ) : null}
            </View>
          ) : null}

          {isBP ? (
            <>
              <Text style={styles.sectionLabel}>Systolic</Text>
              <Input
                value={systolic}
                onChangeText={setSystolic}
                placeholder="e.g. 140"
                keyboardType="number-pad"
              />

              <View style={{ height: theme.spacing.md }} />

              <Text style={styles.sectionLabel}>Diastolic</Text>
              <Input
                value={diastolic}
                onChangeText={setDiastolic}
                placeholder="e.g. 90"
                keyboardType="number-pad"
              />
            </>
          ) : (
            <>
              <Text style={styles.sectionLabel}>{valueLabel}</Text>
              <Input
                value={value}
                onChangeText={setValue}
                placeholder="Enter value"
                keyboardType="numeric"
              />
            </>
          )}

          <View style={{ height: theme.spacing.md }} />

          <Text style={styles.sectionLabel}>Notes</Text>
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional"
            multiline
            style={{ minHeight: 88 }}
          />

          <View style={{ height: theme.spacing.lg }} />

          <Button
            label={loading ? "Saving..." : "Save"}
            onPress={onSave}
            disabled={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 8 },
  title: { fontSize: 18, fontWeight: "900", color: theme.colors.text, marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: "900", color: theme.colors.textSecondary, marginBottom: 6 },
  dateRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    marginBottom: theme.spacing.md,
  },
  dateText: { fontSize: 14, fontWeight: "900", color: theme.colors.text },
  dateHint: { marginTop: 2, fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary },

  error: { color: theme.colors.danger, fontWeight: "800" },
});
