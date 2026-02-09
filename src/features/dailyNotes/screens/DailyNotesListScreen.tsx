// src/features/dailyNotes/screens/DailyNotesListScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { Button } from "../../../ui/Button";
import { SectionHeader } from "../../../ui/SectionHeader";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";

import { dailyNotesService } from "../services/dailyNotesService";
import type { DailyNote } from "../types";

function formatDate(ts: number) {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

const QUICK_TAGS = ["Symptoms", "Side effects", "Questions", "Meds"] as const;

export default function DailyNotesListScreen() {
  const navigation = useNavigation<any>();

  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [loading, setLoading] = useState(false);

  // Quick add
  const [draft, setDraft] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await dailyNotesService.listLatest(90);
      setNotes(rows);
    } catch (e: any) {
      console.log("Daily notes load error:", e);
      Alert.alert("Daily Notes", "Couldn’t load your notes. Make sure you’re signed in.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  const empty = useMemo(() => !loading && notes.length === 0, [loading, notes.length]);

  const toggleTag = (t: string) => {
    setSelectedTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const onQuickSave = useCallback(async () => {
    const text = draft.trim();
    if (!text || saving) return;

    try {
      setSaving(true);

      // Try common method names, so this works even if your service differs slightly.
      const svc: any = dailyNotesService as any;

      if (typeof svc.addNote === "function") {
        await svc.addNote({ text, tags: selectedTags });
      } else if (typeof svc.createNote === "function") {
        await svc.createNote({ text, tags: selectedTags });
      } else if (typeof svc.upsertNote === "function") {
        await svc.upsertNote({ text, tags: selectedTags });
      } else {
        // Fallback: route user to the editor if service doesn't support quick add
        navigation.navigate(MainRoutes.DAILY_NOTE_EDIT as any, { presetText: text, presetTags: selectedTags });
        return;
      }

      setDraft("");
      setSelectedTags([]);
      await load();
    } catch (e) {
      console.log("Quick add save error:", e);
      Alert.alert("Daily Notes", "Couldn’t save that note. Try again.");
    } finally {
      setSaving(false);
    }
  }, [draft, load, navigation, saving, selectedTags]);

  const Header = (
    <>
      <SectionHeader title="Daily Quick Notes" />
      <Text style={styles.sub}>One line is enough. This powers your Pre-Visit Pack.</Text>

      <Card style={styles.quickAddCard}>
        <Text style={styles.quickAddLabel}>Add a note</Text>

        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="How are you feeling today? Symptoms, side effects, questions…"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.input}
          multiline
        />

        <View style={styles.tagsRow}>
          {QUICK_TAGS.map((t) => {
            const active = selectedTags.includes(t);
            return (
              <TouchableOpacity
                key={t}
                activeOpacity={0.9}
                onPress={() => toggleTag(t)}
                style={[styles.tagChip, active ? styles.tagChipActive : null]}
              >
                <Text style={[styles.tagText, active ? styles.tagTextActive : null]}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: theme.spacing.sm }} />

        <Button
          label={saving ? "Saving…" : "Save note"}
          onPress={() => void onQuickSave()}
          disabled={saving || draft.trim().length === 0}
        />

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate(MainRoutes.DAILY_NOTE_EDIT as any)}
          style={styles.secondaryRow}
        >
          <Feather name="edit-3" size={16} color={theme.colors.brand} />
          <Text style={styles.secondaryText}>Open full editor</Text>
          <View style={{ flex: 1 }} />
          <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </Card>

      {empty ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No notes yet</Text>
          <Text style={styles.emptySub}>
            Add quick notes daily — symptoms, side effects, questions — then generate a Pre-Visit Pack before appointments.
          </Text>
        </Card>
      ) : null}

      <Text style={styles.listLabel}>Recent notes</Text>
    </>
  );

  return (
    <ScreenContainer
      preset="list"
      showHeader
      title="Daily Notes"
      headerCanGoBack
      contentStyle={styles.container}
    >
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
        renderItem={({ item }) => (
          <Card style={styles.noteCard}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate(MainRoutes.DAILY_NOTE_EDIT as any, { noteId: item.id })}
              style={styles.noteRow}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.noteDate}>{formatDate(item.createdAt)}</Text>
                <Text numberOfLines={3} style={styles.noteText}>
                  {item.text}
                </Text>

                {item.tags?.length ? (
                  <Text style={styles.tagsText}>Tags: {item.tags.join(", ")}</Text>
                ) : null}
              </View>

              <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </Card>
        )}
        ListFooterComponent={
          loading ? <Text style={styles.loading}>Loading…</Text> : <View style={{ height: 1 }} />
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: theme.spacing.md },

  sub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: theme.spacing.sm,
  },

  quickAddCard: { marginBottom: theme.spacing.sm },

  quickAddLabel: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  input: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: theme.spacing.sm,
  },

  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  tagChipActive: {
    borderColor: theme.colors.brand,
    backgroundColor: theme.colors.brandTint,
  },
  tagText: { fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary },
  tagTextActive: { color: theme.colors.text },

  secondaryRow: {
    marginTop: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.card,
  },
  secondaryText: { fontSize: 13, fontWeight: "900", color: theme.colors.text },

  emptyCard: { marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm },
  emptyTitle: { fontSize: 14, fontWeight: "900", color: theme.colors.text, marginBottom: 4 },
  emptySub: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, lineHeight: 16 },

  listLabel: {
    marginTop: theme.spacing.sm,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  noteCard: { marginTop: theme.spacing.sm },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  noteDate: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  noteText: { fontSize: 13, fontWeight: "700", color: theme.colors.text, lineHeight: 18 },
  tagsText: { marginTop: 8, fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary },

  loading: {
    textAlign: "center",
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
});
