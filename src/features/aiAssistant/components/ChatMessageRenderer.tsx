// src/features/aiAssistant/components/ChatMessageRenderer.tsx

import React from "react";
import { ChatBubble } from "./ChatBubble";
import type { AIMessage } from "../hooks/useAIChat";

interface Props {
  message: AIMessage;
}

export const ChatMessageRenderer: React.FC<Props> = ({ message }) => {
  // We only handle plain text messages for now.
  // System messages are hidden from the UI.

  if (message.role === "system") return null;

  return (
    <ChatBubble
      role={message.role === "user" ? "user" : "assistant"}
      text={message.content ?? ""}
    />
  );
};
