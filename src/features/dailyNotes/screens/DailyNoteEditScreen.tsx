// src/features/dailyNotes/screens/DailyNoteEditScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { Input } from "../../../ui/Input";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";

import type { DailyNoteTag } from "../types";
import { dailyNotesService } from "../services/dailyNotesService";

const TAGS: { key: DailyNoteTag; label: string; icon: any }[] = [
  { key: "symptoms", label: "Symptoms", icon: "activity" },
  { key: "side_effects", label: "Side effects", icon: "alert-triangle" },
  { key: "meds", label: "Meds", icon: "package" },
  { key: "questions", label: "Questions", icon: "help-circle" },
  { key: "follow_up", label: "Follow-up", icon: "calendar" },
];

export default function DailyNoteEditScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const noteId: string | undefined = route?.params?.noteId;

  const [text, setText] = useState("");
  const [tags, setTags] = useState<DailyNoteTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [hydrating, setHydrating] = useState(Boolean(noteId));

  const title = noteId ? "Edit Note" : "New Note";

  const toggleTag = (t: DailyNoteTag) => {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const canSave = useMemo(() => text.trim().length > 0 && !loading, [text, loading]);

  const hydrate = useCallback(async () => {
    if (!noteId) return;
    try {
      setHydrating(true);
      const n = await dailyNotesService.getById(noteId);
      if (!n) {
        Alert.alert("Daily Notes", "That note no longer exists.");
        navigation.goBack();
        return;
      }
      setText(n.text ?? "");
      setTags((n.tags ?? []) as DailyNoteTag[]);
    } catch (e) {
      console.log("Daily note hydrate error:", e);
      Alert.alert("Daily Notes", "Couldn’t load that note.");
      navigation.goBack();
    } finally {
      setHydrating(false);
    }
  }, [navigation, noteId]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const onSave = useCallback(async () => {
    const t = text.trim();
    if (!t) return;

    try {
      setLoading(true);
      if (noteId) {
        await dailyNotesService.update(noteId, { text: t, tags });
      } else {
        await dailyNotesService.create({ text: t, tags });
      }
      navigation.navigate(MainRoutes.DAILY_NOTES_LIST as any);
    } catch (e) {
      console.log("Daily note save error:", e);
      Alert.alert("Daily Notes", "Couldn’t save your note. Make sure you’re signed in.");
    } finally {
      setLoading(false);
    }
  }, [navigation, noteId, tags, text]);

  const onDelete = useCallback(() => {
    if (!noteId) return;

    Alert.alert("Delete note?", "This can’t be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await dailyNotesService.remove(noteId);
            navigation.navigate(MainRoutes.DAILY_NOTES_LIST as any);
          } catch (e) {
            console.log("Daily note delete error:", e);
            Alert.alert("Daily Notes", "Couldn’t delete that note.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }, [navigation, noteId]);

  return (
    <ScreenContainer showHeader headerCanGoBack title={title} contentStyle={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.label}>What changed today?</Text>
        <Input
          value={text}
          onChangeText={setText}
          placeholder="Symptoms, side effects, questions, medication issues…"
          multiline
          style={styles.textArea}
        />

        <View style={{ height: theme.spacing.md }} />

        <Text style={styles.label}>Tags (optional)</Text>
        <View style={styles.tagGrid}>
          {TAGS.map((t) => {
            const active = tags.includes(t.key);
            return (
              <TouchableOpacity
                key={t.key}
                activeOpacity={0.9}
                onPress={() => toggleTag(t.key)}
                style={[styles.tagChip, active ? styles.tagChipActive : null]}
              >
                <Feather
                  name={t.icon}
                  size={14}
                  color={active ? theme.colors.brand : theme.colors.textSecondary}
                />
                <Text style={[styles.tagText, active ? styles.tagTextActive : null]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: theme.spacing.lg }} />

        <Button label={loading ? "Saving…" : "Save"} onPress={onSave} disabled={!canSave} />

        {noteId ? (
          <View style={{ marginTop: theme.spacing.sm }}>
            <Button
              label="Delete"
              variant="secondary"
              onPress={onDelete}
              disabled={loading}
            />
          </View>
        ) : null}

        {hydrating ? <Text style={styles.loading}>Loading…</Text> : null}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: theme.spacing.md },

  card: {},

  label: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  textArea: {
    minHeight: 140,
    textAlignVertical: "top",
  },

  tagGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },

  tagChipActive: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandTint,
  },

  tagText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textSecondary,
  },

  tagTextActive: {
    color: theme.colors.text,
  },

  loading: {
    textAlign: "center",
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
});
