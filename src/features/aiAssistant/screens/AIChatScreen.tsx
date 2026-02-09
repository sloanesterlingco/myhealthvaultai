// src/features/aiAssistant/screens/AIChatScreen.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";

import ScreenContainer from "../../../ui/ScreenContainer";
import { theme } from "../../../theme";

import { ChatInput } from "../components/ChatInput";
import { sendChat, type ChatTurn } from "../services/aiService";

import { useNavigation, useRoute } from "@react-navigation/native";

type AIChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: number;
};

const CHAT_PATH = "/aiApi/ai/chat";

const PROMPT_SUGGESTIONS: { title: string; prompt: string }[] = [
  { title: "Symptoms", prompt: "I have ___ for ___ days. What questions should I ask my doctor?" },
  { title: "Visit-ready summary", prompt: "Summarize my recent timeline into a short visit-ready summary." },
  { title: "Explain something", prompt: "Explain ___ in simple terms and give me questions to ask my doctor." },
  { title: "Medications", prompt: "Help me organize my meds, side effects, and questions for my appointment." },
  { title: "Plan my appointment", prompt: "Make a 1-minute script I can say to my doctor about what’s been going on." },
];

export default function AIChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const scrollRef = useRef<ScrollView>(null);

  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi — tell me what’s going on and I’ll help you organize it.",
      createdAt: Date.now(),
    },
  ]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const normalized = useMemo(
    () => messages.filter((m) => m.role !== "system" && m.content.trim().length > 0),
    [messages]
  );

  const hasUserMessage = useMemo(
    () => normalized.some((m) => m.role === "user" && m.content.trim().length > 0),
    [normalized]
  );

  const runSend = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t || loading) return;

      const userMsg: AIChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: t,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const turns: ChatTurn[] = [...normalized, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const replyTurns = await sendChat(CHAT_PATH, turns);

        const assistantTurn =
          replyTurns
            .slice()
            .reverse()
            .find((x: any) => x?.role === "assistant" && String(x?.content ?? "").trim().length > 0) ??
          null;

        const assistantMsg: AIChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: String(assistantTurn?.content ?? "Got it."),
          createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        scrollToBottom();
      } catch (e: any) {
        console.log("AI chat error:", e);

        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "Sorry — I couldn’t reach the AI service. Try again in a moment.",
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, normalized, scrollToBottom]
  );

  const onSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || loading) return;

    setDraft("");
    await runSend(text);
  }, [draft, loading, runSend]);

  // Auto-send dashboard quick prompt once (if provided)
  const autoSentRef = useRef(false);
  useEffect(() => {
    if (autoSentRef.current) return;

    const initialMessage = String(route?.params?.initialMessage ?? "").trim();
    if (!initialMessage) return;

    autoSentRef.current = true;
    setDraft("");
    void runSend(initialMessage);
  }, [route?.params?.initialMessage, runSend]);

  const onTapSuggestion = (prompt: string) => {
    setDraft(prompt);
  };

  return (
    <ScreenContainer
      scroll={false}
      showHeader={true}
      title="Copilot"
      headerCanGoBack={true}
      // ✅ PURE AI: no avatar/settings buttons
      headerShowAvatar={false}
      headerShowSettings={false}
      keyboardAvoiding={false}
      contentStyle={styles.container}
    >
      {/* Prompt suggestions (only before first user message) */}
      {!hasUserMessage ? (
        <View style={styles.suggestWrap}>
          <Text style={styles.suggestTitle}>Ask Copilot your health care questions</Text>
          <Text style={styles.suggestSub}>
            <Text style={styles.italic}>
              Examples: symptoms, explanations, what to ask your doctor, visit-ready summaries.
            </Text>
          </Text>

          <View style={styles.suggestList}>
            {PROMPT_SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s.title}
                activeOpacity={0.88}
                onPress={() => onTapSuggestion(s.prompt)}
                style={styles.suggestRow}
              >
                <Text style={styles.suggestRowTitle}>{s.title}</Text>
                <Text style={styles.suggestRowPrompt}>
                  <Text style={styles.italic}>{s.prompt}</Text>
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
      >
        {normalized.map((m) => {
          const isUser = m.role === "user";
          return (
            <View key={m.id} style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
              <Text style={styles.bubbleText}>{m.content}</Text>
            </View>
          );
        })}

        {loading ? <Text style={styles.typingText}>Copilot is thinking…</Text> : null}
      </ScrollView>

      <View style={styles.inputWrap}>
        <ChatInput value={draft} onChangeText={setDraft} onSend={() => void onSend()} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { paddingTop: 0, paddingHorizontal: 0, paddingBottom: 0 },

  suggestWrap: {
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.lg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.card,
  },
  suggestTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 6,
  },
  suggestSub: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: theme.spacing.md,
  },
  italic: { fontStyle: "italic" },

  suggestList: { gap: 10 },
  suggestRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    backgroundColor: theme.colors.surface,
  },
  suggestRowTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  suggestRowPrompt: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.md,
  },
  inputWrap: { paddingHorizontal: 0, paddingBottom: 0 },

  bubble: {
    maxWidth: "92%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  userBubble: { alignSelf: "flex-end", backgroundColor: theme.colors.brandTint },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: theme.colors.card },

  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text,
  },
  typingText: {
    marginTop: 4,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
});
