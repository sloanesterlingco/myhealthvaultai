// src/features/aiAssistant/services/aiService.ts
//
// RN SAFE: no OpenAI SDK here.
// Calls your backend (EXPO_PUBLIC_API_BASE_URL) which talks to OpenAI securely.

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export type ChatTurn = {
  role: "user" | "assistant" | "system";
  content: any; // keep flexible: some callers may send structured content (audio, etc.)
};

export type ParsedCondition = {
  name: string;
  description?: string | null;
  icd10?: { code: string; display: string } | null;
};

function getClientTimeZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || "UTC";
  } catch {
    return "UTC";
  }
}

function assertBaseUrl() {
  if (!API_BASE_URL) {
    throw new Error(
      "Missing EXPO_PUBLIC_API_BASE_URL. Set it to: https://us-central1-myhealthvaultai.cloudfunctions.net (no trailing path) and restart with: npx expo start -c"
    );
  }
}

async function postJson<T>(path: string, body: any): Promise<T> {
  assertBaseUrl();

  const url = `${API_BASE_URL}${path}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI request failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

/**
 * Generic chat helper that posts to your backend chat endpoint.
 * Backend expects: { messages: ChatTurn[], tz?: string }
 * Backend returns: { messages: ChatTurn[] }
 *
 * Valid paths:
 * - "/aiApi/ai/chat"
 * - "/aiApi/ai/followups" (if you wire it in your UI later)
 */
export async function sendChat(path: string, messages: ChatTurn[]): Promise<ChatTurn[]> {
  const tz = getClientTimeZone();
  const data = await postJson<{ messages?: ChatTurn[] }>(path, { messages, tz });
  return Array.isArray(data?.messages) ? data.messages : [];
}

/**
 * ✅ Chart setup "next step" endpoint
 * Backend route: POST /aiApi/ai/chart-setup/next
 * Expects: { messages: ChatTurn[], chartSetup?: any, tz?: string }
 * Returns: { reply: string, done: boolean, chartSetup: any, patch: any }
 */
export async function chartSetupNext(body: { messages: ChatTurn[]; chartSetup: any; tz?: string }) {
  const tz = body.tz ?? getClientTimeZone();

  return await postJson<{
    reply: string;
    done: boolean;
    chartSetup: any;
    patch: any;
  }>("/aiApi/ai/chart-setup/next", { ...body, tz });
}

/**
 * ✅ Helper: pull the last assistant message content from a chat result
 */
function getLastAssistantText(turns: ChatTurn[]): string {
  const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant");
  const content = lastAssistant?.content;

  // content might be string OR structured; normalize to string safely
  if (typeof content === "string") return content.trim();
  try {
    return JSON.stringify(content ?? "").trim();
  } catch {
    return String(content ?? "").trim();
  }
}

/**
 * ✅ This is what your hooks/screens expect.
 * They call: aiService.sendMessage({ messages: [...] })
 * We send it to: POST /aiApi/ai/chat (unless args.path is provided)
 * We return: assistant text (string)
 */
async function sendMessage(args: { messages: ChatTurn[]; path?: string }): Promise<string> {
  const path = args.path ?? "/aiApi/ai/chat";
  const turns = await sendChat(path, args.messages);
  return getLastAssistantText(turns);
}

export const aiService = {
  /**
   * ✅ Primary method used across the app.
   */
  sendMessage,

  /**
   * ✅ Back-compat alias:
   * Some files call aiService.chat({ messages, path })
   * Keep this so we don’t have to refactor callers during stabilization.
   */
  chat: sendMessage,

  /**
   * v1-safe condition "parsing":
   * Uses your existing backend normalizer (no external ICD/diagnosis logic).
   *
   * Backend route: POST /aiNormalizeHistory
   * Expects: { text: string, type: "condition" | "procedure" }
   * Returns: { normalized: string, candidates: [], engine: string }
   */
  async parseCondition(args: { patientId?: string; freeText: string }): Promise<ParsedCondition> {
    const data = await postJson<any>("/aiNormalizeHistory", {
      text: args.freeText,
      type: "condition",
    });

    const normalized = String(data?.normalized ?? "").trim();

    return {
      name: normalized || args.freeText.trim(),
      description: null,
      icd10: null,
    };
  },
};

export default aiService;
