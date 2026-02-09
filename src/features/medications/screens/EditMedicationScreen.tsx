// src/features/medications/screens/EditMedicationScreen.tsx

import { useRoute, useNavigation } from "@react-navigation/native";
import React, { useMemo } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";

import { ScreenContainer } from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { theme } from "../../../theme";
import { useEditMedication } from "../hooks/useEditMedication";
import { MainRoutes } from "../../../navigation/types";

export const EditMedicationScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { medication: initialMedication } = (route.params || {}) as any;

  const { medication, setField, saveMedication } =
    useEditMedication(initialMedication);

  // Treat medication as inactive if it matches common patterns
  const isInactive = useMemo(() => {
    const m: any = medication ?? {};
    if (typeof m.status === "string") return m.status === "inactive";
    if (typeof m.isActive === "boolean") return m.isActive === false;
    if (typeof m.active === "boolean") return m.active === false;
    if (typeof m.endDate === "string" && m.endDate.trim().length > 0) return true;
    if (typeof m.stoppedAt === "string" && m.stoppedAt.trim().length > 0) return true;
    return false;
  }, [medication]);

  const applyInactiveValue = (inactive: boolean) => {
    const m: any = medication ?? {};

    // Prefer writing to fields that already exist on the object
    if (m.status !== undefined) {
      setField("status" as any, inactive ? "inactive" : "active");
      if (m.inactiveAt !== undefined) {
        setField("inactiveAt" as any, inactive ? Date.now() : null);
      }
      return;
    }

    if (m.isActive !== undefined) {
      setField("isActive" as any, !inactive);
      if (m.inactiveAt !== undefined) {
        setField("inactiveAt" as any, inactive ? Date.now() : null);
      }
      return;
    }

    if (m.active !== undefined) {
      setField("active" as any, !inactive);
      if (m.inactiveAt !== undefined) {
        setField("inactiveAt" as any, inactive ? Date.now() : null);
      }
      return;
    }

    // Fallback: add status (stable and simple)
    setField("status" as any, inactive ? "inactive" : "active");
  };

  const onToggleInactive = (nextInactive: boolean) => {
    if (nextInactive) {
      Alert.alert(
        "Mark medication as inactive?",
        "This hides it from your active medication list but keeps it in your history.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark inactive",
            style: "destructive",
            onPress: () => applyInactiveValue(true),
          },
        ]
      );
      return;
    }

    applyInactiveValue(false);
  };

  const onSave = async () => {
    const ok = await saveMedication();
    if (!ok) return;

    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate(MainRoutes.MEDICATIONS_LIST);
  };

  return (
    <ScreenContainer
      showHeader={true}
      title="Edit Medication"
      headerShowLogo={false}
      headerShowAvatar={true}
      scroll={true}
      contentStyle={{ paddingTop: 0 }}
    >
      <Card style={styles.card}>
        <Text style={styles.kicker}>Medication details</Text>

        <View style={styles.form}>
          <Input
            label="Name"
            value={medication?.name ?? ""}
            onChangeText={(t) => setField("name", t)}
          />

          <Input
            label="Dosage"
            value={medication?.dosage ?? medication?.dose ?? ""}
            onChangeText={(t) => setField("dosage", t)}
          />

          <Input
            label="Frequency"
            value={medication?.frequency ?? ""}
            onChangeText={(t) => setField("frequency", t)}
          />

          <Input
            label="Start Date"
            value={medication?.startDate ?? ""}
            onChangeText={(t) => setField("startDate", t)}
          />

          <Input
            label="End Date"
            value={medication?.endDate ?? ""}
            onChangeText={(t) => setField("endDate", t)}
          />

          <Input
            label="Notes"
            value={medication?.notes ?? ""}
            multiline
            numberOfLines={4}
            onChangeText={(t) => setField("notes", t)}
          />

          {/* Inactive toggle */}
          <View style={styles.inactiveRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inactiveLabel}>Mark as inactive</Text>
              <Text style={styles.inactiveHint}>
                Inactive meds are hidden from your active list, but kept in history.
              </Text>
            </View>

            <Switch value={isInactive} onValueChange={onToggleInactive} />
          </View>

          <Button label="Save changes" onPress={onSave} />
        </View>
      </Card>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: theme.spacing.sm,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  form: {
    gap: theme.spacing.md,
  },
  inactiveRow: {
    marginTop: theme.spacing.xs ?? 0,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.md,
  },
  inactiveLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: theme.colors.text,
  },
  inactiveHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
});

export default EditMedicationScreen;
