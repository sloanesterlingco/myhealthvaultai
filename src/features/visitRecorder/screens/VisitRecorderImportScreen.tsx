// src/features/visitRecorder/screens/VisitRecorderImportScreen.tsx

import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";
import { timelineService } from "../../medicalTimeline/services/timelineService";

type RouteParams = {
  sharedText?: string;
  sharedUrl?: string;
  mimeType?: string;
  sourceApp?: string;
};

function guessTitleFromText(text: string) {
  const t = (text || "").trim();
  if (!t) return "Visit summary";

  // Small heuristic: if first line looks like a title, use it.
  const firstLine = t.split("\n").map((x) => x.trim()).filter(Boolean)[0] ?? "";
  if (firstLine.length >= 6 && firstLine.length <= 60) return firstLine;

  return "Visit summary";
}

export default function VisitRecorderImportScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const params = (route.params ?? {}) as RouteParams;

  const initialText = useMemo(() => {
    const txt = params.sharedText ?? "";
    const url = params.sharedUrl ? `\n\nShared file/link:\n${params.sharedUrl}` : "";
    return `${txt}${url}`.trim();
  }, [params.sharedText, params.sharedUrl]);

  const [title, setTitle] = useState<string>(guessTitleFromText(initialText));
  const [notes, setNotes] = useState<string>(initialText);

  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    try {
      const trimmed = (notes || "").trim();
      if (!trimmed) {
        Alert.alert("Nothing to import", "The shared content looks empty.");
        return;
      }

      setSaving(true);

      await timelineService.addEvent({
        type: "AI_NOTE",
        category: "visits",
        summary: (title || "Visit summary").trim(),
        detail: trimmed,
        level: "low",
        timestamp: Date.now(),
        meta: {
          source: "visit_recorder",
          importedVia: "share",
          mimeType: params.mimeType ?? "text/plain",
          sourceApp: params.sourceApp ?? "unknown",
        },
      });

      Alert.alert("Saved", "Visit summary added to your timeline.", [
        {
          text: "View timeline",
          onPress: () => navigation.navigate(MainRoutes.TIMELINE_TAB as any),
        },
      ]);
    } catch (e) {
      console.log("VisitRecorder import save error:", e);
      Alert.alert("Error", "Could not save this to your timeline.");
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    navigation.goBack();
  };

  return (
    <ScreenContainer showHeader headerTitle="Import visit summary">
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.hint}>
          Shared from Visit Recorder. Review, then tap save.
        </Text>

        <Card style={styles.card}>
          <Input
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Visit summary"
          />

          <View style={{ height: theme.spacing.md }} />

          <Input
            label="Summary text"
            value={notes}
            onChangeText={setNotes}
            placeholder="Shared text will appear here…"
            multiline
            style={styles.textArea}
          />

          <View style={{ height: theme.spacing.lg }} />

          <Button
            label={saving ? "Saving…" : "Save to Timeline"}
            onPress={onSave}
          />

          <View style={{ height: theme.spacing.sm }} />

          <Button
            label="Cancel"
            variant="secondary"
            onPress={onCancel}
          />
        </Card>

        <Text style={styles.footer}>
          Tip: This creates a Timeline entry. In V2 we’ll auto-extract meds, follow-ups, tests, and changes.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  hint: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginBottom: theme.spacing.sm,
  },
  card: {},
  textArea: {
    minHeight: 220,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  footer: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
