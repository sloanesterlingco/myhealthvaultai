// src/features/aiAssistant/screens/ChartSetupAIChatScreen.tsx

import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { theme } from "../../../theme";
import { Button } from "../../../ui/Button";

import { ChatInput } from "../components/ChatInput";
import { PushToTalkButton } from "../../../shared/components/PushToTalkButton";

import { MainRoutes } from "../../../navigation/types";
import { patientAggregationService } from "../services/patientAggregationService";
import { useChartSetupInterviewWizard } from "../hooks/useChartSetupInterviewWizard";

function isDemographicsComplete(d: any) {
  return Boolean(d?.firstName && d?.lastName && (d?.dateOfBirth || d?.dob));
}

type Role = "user" | "assistant";

export default function ChartSetupAIChatScreen() {
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);

  const patient: any = patientAggregationService.getPatient?.() ?? {};
  const demo = patient?.demographics ?? {};
  const demoComplete = isDemographicsComplete(demo);

  const { messages, loading, error, isDone, headerSubtitle, sendAnswer, resetInterview } =
    useChartSetupInterviewWizard();

  const [draft, setDraft] = useState("");

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const goDashboard = () =>
    navigation.navigate(MainRoutes.DASHBOARD_TAB, { screen: MainRoutes.DASHBOARD });

  const goReview = () =>
    navigation.navigate(MainRoutes.AI_HOME_TAB, { screen: MainRoutes.CHART_SETUP_REVIEW });

  const onSpeechFinalText = useCallback((text: string) => {
    if (!text?.trim()) return;
    setDraft((prev) => {
      const p = (prev ?? "").trim();
      return p ? `${p} ${text.trim()}` : text.trim();
    });
  }, []);

  const doSend = useCallback(async () => {
    const t = (draft ?? "").trim();
    if (!t || loading) return;
    setDraft("");
    scrollToBottom();
    await sendAnswer(t);
    scrollToBottom();
  }, [draft, loading, sendAnswer, scrollToBottom]);

  const title = useMemo(() => {
    return isDone ? "Chart Setup — Complete" : "Chart Setup Interview";
  }, [isDone]);

  // If demographics isn’t done, block interview (keeps data quality high for EU demo)
  if (!demoComplete) {
    return (
      <ScreenContainer scroll title="Chart Setup" headerCanGoBack contentStyle={styles.container}>
        <View style={styles.blockCard}>
          <Text style={styles.blockTitle}>Complete demographics first</Text>
          <Text style={styles.blockSub}>
            To keep your chart accurate (and your summaries clean), please fill out
            your name + DOB before using the intake interview.
          </Text>

          <Button label="Go to Dashboard" onPress={goDashboard} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false} title={title} headerCanGoBack contentStyle={styles.containerNoPad}>
      {/* Premium top banner */}
      <View style={styles.topBanner}>
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>DRAFT</Text>
        </View>

        <Text style={styles.topTitle}>Nothing saves until you confirm</Text>
        <Text style={styles.topSub}>{headerSubtitle}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.actionsRow}>
          {isDone ? (
            <Button label="Review & Confirm" onPress={goReview} />
          ) : (
            <>
              <Button label="Restart" variant="secondary" onPress={resetInterview} />
              <View style={{ width: theme.spacing.sm }} />
              <Button label="Review" onPress={goReview} />
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
        {messages.map((m: any) => {
          const isUser = (m?.role as Role) === "user";
          return (
            <View
              key={m.id}
              style={[
                styles.bubble,
                isUser ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text style={[styles.bubbleText, isUser ? styles.userText : null]}>
                {m.content}
              </Text>
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
        <PushToTalkButton
          onFinalText={onSpeechFinalText}
          labelIdle="Tap to Speak"
          labelListening="Listening… Tap to Stop"
          showDebugStatus
        />

        <View style={styles.inputWrap}>
          <ChatInput value={draft} onChangeText={setDraft} onSend={() => void doSend()} />
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },

  containerNoPad: { paddingTop: 0, paddingHorizontal: 0, paddingBottom: 0 },

  blockCard: {
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  blockTitle: { fontSize: 18, fontWeight: "900", color: theme.colors.text },
  blockSub: { fontSize: 14, fontWeight: "700", color: theme.colors.textSecondary },

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
  topTitle: { fontSize: 18, fontWeight: "900", color: theme.colors.text },
  topSub: { marginTop: 6, fontSize: 13, fontWeight: "800", color: theme.colors.textSecondary },
  errorText: { marginTop: 10, color: theme.colors.danger, fontWeight: "800" },

  actionsRow: { marginTop: theme.spacing.md, flexDirection: "row", alignItems: "center" },

  scroll: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: theme.spacing.lg },

  bubble: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    maxWidth: "92%",
  },
  assistantBubble: {
    backgroundColor: theme.colors.surface,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  userBubble: {
    backgroundColor: theme.colors.brand,
    alignSelf: "flex-end",
  },
  bubbleText: { color: theme.colors.text, fontWeight: "700", fontSize: 14, lineHeight: 19 },
  userText: { color: "white" },

  inputWrap: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.md },
});
