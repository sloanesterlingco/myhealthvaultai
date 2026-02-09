// src/features/aiAssistant/hooks/useChartSetupAssistant.js

import { useMemo, useRef, useState } from "react";
import { useLoading } from "../../../hooks/useLoading";
import { useToast } from "../../../hooks/useToast";

let chartSetupIdCounter = 0;

function uid() {
  return String(chartSetupIdCounter++);
}

function getClientTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

async function postJson(path, body) {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (!base) throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed: ${res.status} ${text}`);
  }

  return await res.json();
}

/**
 * Converts this hook’s message format -> backend format
 */
function toChatTurns(messages) {
  return (messages || [])
    .map((m) => ({
      role: m.from === "user" ? "user" : "assistant",
      content: String(m.text ?? ""),
    }))
    .filter((m) => m.content.trim().length > 0);
}

export const useChartSetupAssistant = () => {
  const [messages, setMessages] = useState([
    {
      id: uid(),
      from: "assistant",
      text:
        "Hi! I’m your Chart Setup Assistant. I’ll help you get your chart ready in a few quick steps:\n\n" +
        "1️⃣ Basic profile\n" +
        "2️⃣ Providers\n" +
        "3️⃣ Medications\n" +
        "4️⃣ Records & lab results\n\n" +
        "Tell me where you’d like to start, or say “guide me” and I’ll walk you through.",
    },
  ]);

  const [input, setInput] = useState("");

  const { showLoading, hideLoading } = useLoading();
  const { showError } = useToast();

  // Keep a live reference so we don't hit stale closures
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Pull chartSetup snapshot from your existing store/service if you have it.
  // If you don’t yet, this still works with {}.
  // IMPORTANT: Replace this with your real source when ready.
  const chartSetup = useMemo(() => {
    // If you already have patientAggregationService available here,
    // you can import it and use:
    // return patientAggregationService.getPatient?.()?.chartSetup ?? {};
    return {};
  }, []);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage = { id: uid(), from: "user", text: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      showLoading();

      // Build history in the format backend expects
      const turns = toChatTurns([...messagesRef.current, userMessage]);

      // Always send timezone so the backend can respond in local time if asked
      const tz = getClientTimeZone();

      // ✅ Call your backend chart setup endpoint
      const resp = await postJson("/ai/chart-setup/next", {
        messages: turns,
        chartSetup,
        tz,
      });

      const replyText = String(resp?.reply ?? "").trim() || "OK";

      const assistantMessage = { id: uid(), from: "assistant", text: replyText };
      setMessages((prev) => [...prev, assistantMessage]);

      // Optional: if your backend returns chartSetup, you can persist it here.
      // Example (once wired):
      // patientAggregationService.setChartSetupProgress?.({ chartSetup: resp?.chartSetup ?? {} });

      // Optional: if done, navigate somewhere (once you add navigation here):
      // if (resp?.done) navigation.navigate(MainRoutes.PROVIDER_SUMMARY);
    } catch (err) {
      console.log("Chart setup assistant error", err);
      showError("There was a problem talking to the assistant.");
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          from: "assistant",
          text: "Sorry — I hit an error. Please try sending that again.",
        },
      ]);
    } finally {
      hideLoading();
    }
  };

  return {
    messages,
    input,
    setInput,
    sendMessage,
  };
};
