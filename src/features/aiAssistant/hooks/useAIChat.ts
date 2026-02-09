// src/features/aiAssistant/hooks/useAIChat.ts

import { useState } from "react";
import { sendChat, type ChatTurn } from "../services/aiService";
import { patientAggregationService } from "../services/patientAggregationService";
import { promptBuilders } from "../utils/promptBuilders";
import { followUpService } from "../services/followUpService";
import { redFlagService, type RedFlagAlert } from "../services/redFlagService";
import { timelineService } from "../../medicalTimeline/services/timelineService";
import { evaluateMedicationInteractions } from "../../medications/services/medicationInteractionEngine";
import { patientService } from "../../../services/patientService";

/** INTERNAL MESSAGE TYPES (App-level) */
export type AIMessageRole = "system" | "user" | "assistant" | "interaction_alert";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

/** Convert internal → API-safe turns */
function toChatTurn(msg: AIMessage): ChatTurn {
  return {
    role: msg.role === "interaction_alert" ? "assistant" : msg.role,
    content: msg.content,
  };
}

export const useAIChat = () => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [followUps, setFollowUps] = useState<any | null>(null);
  const [redFlags, setRedFlags] = useState<RedFlagAlert[] | null>(null);

  /** Build patient context for system prompt */
  const patientState = patientAggregationService.getPatient();
  const systemPrompt = promptBuilders.generalChatSystem(patientState);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: AIMessage = { role: "user", content: text };

    setFollowUps(null);
    setRedFlags(null);
    setLoading(true);

    // Add user → placeholder assistant bubble
    setMessages((prev) => [...prev, userMsg, { role: "assistant", content: "" }]);

    try {
      // 1) AI PRIMARY REPLY
      const history: AIMessage[] = [
        { role: "system", content: systemPrompt },
        ...messages,
        userMsg,
      ];

      const safeHistory: ChatTurn[] = history.map(toChatTurn);

      const replyTurns = await sendChat("/ai/chat", safeHistory);

      const assistantText =
        replyTurns
          .slice()
          .reverse()
          .find(
            (t) =>
              t?.role === "assistant" && String(t?.content ?? "").trim().length > 0
          )?.content ?? "OK";

      // Replace placeholder assistant message
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: assistantText };
        return updated;
      });

      // 2) MEDICATION INTERACTION SAFETY CHECK
      const meds = await patientService.getMedications();
      const medsClean = Array.isArray(meds) ? meds : [];

      const interactions = evaluateMedicationInteractions({
        medications: medsClean.map((m) => ({
          id: m.id,
          name: m.name ?? "",
          genericName: (m.genericName ?? m.name ?? "").toLowerCase(),
        })),
      });

      if (interactions.length > 0) {
        const alertText = `⚠ Medication interaction detected:\n\n${interactions
          .map((i) => `• ${i.summary} (severity: ${i.severity})`)
          .join("\n")}`;

        setMessages((prev) => [...prev, { role: "interaction_alert", content: alertText }]);

        await timelineService.addSafetyEvent({
          title: "Medication Interaction Detected",
          description: interactions.map((i) => i.summary).join("\n"),
          level:
            interactions.some((i) => i.severity === "major")
              ? "high"
              : interactions.some((i) => i.severity === "moderate")
              ? "moderate"
              : "low",
        });
      }

      // 3) MEMORY EXTRACTOR → TIMELINE EVENTS
      await timelineService.extractEvents(text);

      // 4) FOLLOW-UP ENGINE
      const updatedState = patientAggregationService.getPatient();
      const f = await followUpService.getFollowUps(text, updatedState);
      if (f) setFollowUps(f);

      // 5) RED FLAG ENGINE
      const flags = await redFlagService.analyzeMessage(text, updatedState);
      if (flags && flags.length > 0) setRedFlags(flags);
    } catch (err) {
      console.error("AI chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I had trouble responding." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([]);
    setFollowUps(null);
    setRedFlags(null);
  };

  return {
    messages,
    loading,
    sendMessage,
    followUps,
    redFlags,
    resetChat,
  };
};

export default useAIChat;
