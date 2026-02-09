// src/features/aiAssistant/screens/ChartSetupAIChatScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { theme } from "../../../theme";

import { ChatInput } from "../components/ChatInput";
import { useAIChartSetup, type ChartSetupMessage } from "../hooks/useAIChartSetup";
import { patientAggregationService } from "../services/patientAggregationService";

import { PushToTalkButton } from "../../../shared/components/PushToTalkButton";
import { Button } from "../../../ui/Button";
import { MainRoutes } from "../../../navigation/types";
import { useNavigation } from "@react-navigation/native";

type UIMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: number;
};

function isDemographicsComplete(d: any) {
  return Boolean(d?.firstName && d?.lastName && (d?.dateOfBirth || d?.dob));
}

export default function ChartSetupAIChatScreen() {
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);

  const { messages, loading, send, chartSetup, markComplete } = useAIChartSetup();
  const [draft, setDraft] = useState("");

  useEffect(() => {
    try {
      const patient = patientAggregationService.getPatient();
      const demoDone = isDemographicsComplete((patient as any)?.demographics);

      patientAggregationService.setChartSetupProgress({
        status: "in_progress",
        phase: demoDone ? "medical" : "demographics",
        mode: "ai",
      });
    } catch {}
  }, []);

  const isDone = useMemo(() => {
    const status = (chartSetup as any)?.status ?? "";
    const phase = (chartSetup as any)?.phase ?? "";
    return status === "complete" || phase === "complete";
  }, [chartSetup]);

  const normalizedMessages: UIMessage[] = useMemo(() => {
    const list = Array.isArray(messages) ? (messages as ChartSetupMessage[]) : [];
    return list
      .map((m, idx) => ({
        id: String(m.id ?? `${m.role ?? "msg"}-${idx}-${m.createdAt ?? Date.now()}`),
        role: (m.role ?? "assistant") as UIMessage["role"],
        content: String(m.content ?? ""),
        createdAt: typeof m.createdAt === "number" ? m.createdAt : undefined,
      }))
      .filter((m) => m.role !== "system" && m.content.trim().length > 0);
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const doSendText = useCallback(
    async (text: string) => {
      const t = (text ?? "").trim();
      if (!t || loading) return;

      setDraft("");
      scrollToBottom();
      await send(t);
      scrollToBottom();
    },
    [loading, send, scrollToBottom]
  );

  const doSendDraft = useCallback(async () => {
    const text = draft.trim();
    if (!text || loading) return;

    setDraft("");
    scrollToBottom();
    await send(text);
    scrollToBottom();
  }, [draft, loading, send, scrollToBottom]);

  const showDemoReminder = useMemo(() => {
    try {
      const patient = patientAggregationService.getPatient();
      return !isDemographicsComplete((patient as any)?.demographics);
    } catch {
      return false;
    }
  }, []);

  const quickPrompts = useMemo(
    () => [
      {
        key: "next",
        label: "Next questions",
        prompt:
          "What are the next 8 questions you need to complete the medical chart setup? Ask them in a clean numbered list and group them by category (PMH, PSH, FHx, SHx, meds, allergies, ROS).",
      },
    ],
    []
  );

  const onSpeechFinalText = useCallback((text: string) => {
    if (!text?.trim()) return;
    setDraft((prev) => {
      const p = (prev ?? "").trim();
      return p ? `${p} ${text.trim()}` : text.trim();
    });
  }, []);

  const goDashboard = () => navigation.navigate(MainRoutes.DASHBOARD_TAB, { screen: MainRoutes.DASHBOARD });
  const goProviderSummary = () => navigation.navigate(MainRoutes.AI_HOME_TAB, { screen: MainRoutes.PROVIDER_SUMMARY });
  const goReview = () => navigation.navigate(MainRoutes.AI_HOME_TAB, { screen: MainRoutes.CHART_SETUP_REVIEW });

  const finishNow = async () => {
    await markComplete();
    goReview();
  };

  return (
    <ScreenContainer scroll={false} showHeader title="Chart Setup" contentStyle={styles.container}>
      <View style={styles.topBanner}>
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>AUTO-SAVING</Text>
        </View>

        <Text style={styles.topBannerTitle}>{isDone ? "Chart setup complete ✅" : "Writing into your chart as you answer"}</Text>
        <Text style={styles.topBannerSub}>PMH • PSH • Family • Social • Allergies • Medications</Text>

        <View style={styles.doneRow}>
          {isDone ? (
            <>
              <Button label="Review & Confirm" onPress={goReview} />
              <View style={{ width: theme.spacing.sm }} />
              <Button label="Provider Summary" variant="secondary" onPress={goProviderSummary} />
            </>
          ) : (
            <>
              <Button label="Finish & Review" variant="secondary" onPress={() => void finishNow()} />
              <View style={{ width: theme.spacing.sm }} />
              <Button label="Go to Dashboard" onPress={goDashboard} />
            </>
          )}
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {showDemoReminder ? (
          <View style={[styles.bubble, styles.assistantBubble]}>
            <Text style={styles.bubbleText}>
              Quick note: if your demographics aren’t filled out yet, please add them first so your chart and exports are accurate.
              You can still continue here anytime.
            </Text>
          </View>
        ) : null}

        {normalizedMessages.map((m) => {
          const isUser = m.role === "user";
          return (
            <View key={m.id} style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.bubbleText, isUser && styles.userText]}>{m.content}</Text>
            </View>
          );
        })}

        {loading ? (
          <View style={[styles.bubble, styles.assistantBubble]}>
            <Text style={styles.bubbleText}>Thinking…</Text>
          </View>
        ) : null}
      </ScrollView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.quickBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickBarContent}>
            {quickPrompts.map((q) => (
              <TouchableOpacity
                key={q.key}
                style={[styles.quickChip, loading && styles.quickChipDisabled]}
                activeOpacity={0.85}
                disabled={loading}
                onPress={() => void doSendText(q.prompt)}
              >
                <Text style={styles.quickChipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <PushToTalkButton onFinalText={onSpeechFinalText} labelIdle="Tap to Speak" labelListening="Listening… Tap to Stop" />

        <View style={styles.inputWrap}>
          <ChatInput value={draft} onChangeText={setDraft} onSend={() => void doSendDraft()} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 0, paddingHorizontal: 0, paddingBottom: 0 },

  topBanner: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  topBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.brandTint,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.18)",
    marginBottom: 8,
  },
  topBadgeText: {
    fontWeight: "900",
    color: theme.colors.brand,
    letterSpacing: 0.7,
    fontSize: 12,
  },
  topBannerTitle: { fontSize: 20, fontWeight: "900", color: theme.colors.text },
  topBannerSub: { marginTop: 6, fontSize: 13, fontWeight: "700", color: theme.colors.textSecondary },
  doneRow: { marginTop: theme.spacing.md, flexDirection: "row", alignItems: "center" },

  scroll: { flex: 1, paddingHorizontal: theme.spacing.lg },
  scrollContent: { paddingVertical: theme.spacing.md, paddingBottom: theme.spacing.lg },

  bubble: {
    maxWidth: "92%",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: theme.colors.surface, borderColor: theme.colors.borderLight },
  userBubble: { alignSelf: "flex-end", backgroundColor: theme.colors.brandTint, borderColor: "rgba(37, 99, 235, 0.18)" },
  bubbleText: { fontSize: 15, color: theme.colors.text, fontWeight: "700", lineHeight: 21 },
  userText: { color: theme.colors.brand },

  quickBar: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
  },
  quickBarContent: { gap: 10 },
  quickChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  quickChipDisabled: { opacity: 0.6 },
  quickChipText: { fontSize: 13, fontWeight: "900", color: theme.colors.text },

  inputWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
});
