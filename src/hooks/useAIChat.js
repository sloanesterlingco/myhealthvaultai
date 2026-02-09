// src/features/aiAssistant/hooks/useAIChat.js

import { useState } from "react";
import { aiService } from "../services/aiService";
import { patientAggregationService } from "../services/patientAggregationService";
import { promptBuilders } from "../utils/promptBuilders";

/**
 * useAIChat
 * ----------
 * Handles:
 * - Sending a message to AI
 * - Storing message history
 * - Loading state
 * - System prompt personalization
 */

export const useAIChat = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  /** Get full patient chart to personalize AI responses */
  const patientState = patientAggregationService.getPatient();

  /** System prompt gives AI context about the patient */
  const systemPrompt = promptBuilders.generalChatSystem(patientState);

  /**
   * Send a user message to the AI assistant
   */
  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // Add user message to chat
    const newUserMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, newUserMessage]);

    setLoading(true);

    try {
      const aiReply = await aiService.sendMessage({
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          newUserMessage,
        ],
      });

      const newAIMessage = { role: "assistant", content: aiReply };

      setMessages((prev) => [...prev, newAIMessage]);

      return aiReply;
    } catch (err) {
      console.log("AI chat error:", err);

      const errorMsg = {
        role: "assistant",
        content: "I’m having trouble responding right now. Please try again!",
      };

      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset the conversation
   */
  const resetChat = () => {
    setMessages([]);
  };

  return {
    messages,
    loading,
    sendMessage,
    resetChat,
  };
};
