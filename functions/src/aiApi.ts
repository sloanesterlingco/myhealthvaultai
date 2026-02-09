// functions/src/aiApi.ts
import * as functions from "firebase-functions/v1";
import express from "express";
import type { Request, Response } from "express-serve-static-core";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

const app = express();
app.use(express.json());

function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

function safeString(v: any): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}

function formatInTimeZone(nowIso: string, timeZone: string) {
  const d = new Date(nowIso);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  return {
    time: `${get("hour")}:${get("minute")} ${get("dayPeriod")} ${get("timeZoneName")}`.trim(),
    date: `${get("weekday")}, ${get("month")} ${get("day")} ${get("year")}`.trim(),
  };
}

function looksLikeTimeQuestion(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes("what time") ||
    t.includes("current time") ||
    t.includes("time is it") ||
    t.includes("today") ||
    t.includes("what day") ||
    t.includes("date")
  );
}

function normalizeTimeZone(tzRaw?: string): string {
  const tz = (tzRaw ?? "").trim();
  if (!tz) return "UTC";
  const upper = tz.toUpperCase();

  if (tz.includes("/")) return tz;

  if (upper === "MST" || upper === "MDT") return "America/Denver";
  if (upper === "PST" || upper === "PDT") return "America/Los_Angeles";
  if (upper === "CST" || upper === "CDT") return "America/Chicago";
  if (upper === "EST" || upper === "EDT") return "America/New_York";

  return "UTC";
}

async function callOpenAI(apiKey: string, payload: any) {
  const upstreamRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data: any = await upstreamRes.json().catch(() => ({}));
  return { ok: upstreamRes.ok, status: upstreamRes.status, data };
}

/**
 * GENERAL CHAT
 */
app.post("/ai/chat", async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const messages = body.messages as ChatMsg[] | undefined;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const apiKey = getOpenAIKey();
    if (!apiKey) return res.status(500).json({ error: "Missing OpenAI key" });

    const tz = normalizeTimeZone(safeString(body.tz));
    const nowIso = new Date().toISOString();
    const truth = formatInTimeZone(nowIso, tz);

    const lastUser = [...messages].reverse().find((m) => m?.role === "user");
    const lastUserText = String(lastUser?.content ?? "");

    const safetySystem: ChatMsg = {
      role: "system",
      content:
        "You are a health assistant for patient intake and chart setup. " +
        "Do not provide a medical diagnosis. " +
        "Do not provide emergency instructions; if symptoms sound urgent, advise seeking professional care. " +
        "Keep answers concise and ask clarifying questions when needed.",
    };

    const timeSystem: ChatMsg = {
      role: "system",
      content: [
        `TIME_TRUTH:`,
        `- now_utc_iso: ${nowIso}`,
        `- timezone: ${tz}`,
        `- local_time: ${truth.time}`,
        `- local_date: ${truth.date}`,
        ``,
        `Rule: If asked about date/day/time, use TIME_TRUTH exactly. Do not compute timezones yourself.`,
      ].join("\n"),
    };

    const { ok, status, data } = await callOpenAI(apiKey, {
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [timeSystem, safetySystem, ...messages],
    });

    if (!ok) return res.status(status).json({ error: data });

    let content = String(data?.choices?.[0]?.message?.content ?? "OK");

    if (looksLikeTimeQuestion(lastUserText)) {
      const t = lastUserText.toLowerCase();
      if (t.includes("just the time")) content = truth.time;
      else if (t.includes("what day") || t.includes("date")) content = truth.date;
      else content = `${truth.date}\n${truth.time}`;
    }

    return res.json({ messages: [...messages, { role: "assistant", content }] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * FOLLOW-UP SUGGESTIONS (JSON only)
 */
app.post("/ai/followups", async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const messages = body.messages as ChatMsg[] | undefined;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const apiKey = getOpenAIKey();
    if (!apiKey) return res.status(500).json({ error: "Missing OpenAI key" });

    const system: ChatMsg = {
      role: "system",
      content:
        "Return ONLY valid JSON. No prose. No markdown. No backticks. " +
        "If uncertain, return empty arrays for every field.",
    };

    const { ok, status, data } = await callOpenAI(apiKey, {
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [system, ...messages],
      response_format: { type: "json_object" },
    });

    if (!ok) return res.status(status).json({ error: data });

    const content = String(data?.choices?.[0]?.message?.content ?? "{}").trim();

    return res.json({ messages: [...messages, { role: "assistant", content }] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" });
  }
});

/**
 * ✅ CHART SETUP NEXT (partner-demo ready)
 * Expects: { messages: ChatMsg[], chartSetup?: any, tz?: string }
 * Returns: { reply: string, chartSetup: any, patch: any, done: boolean }
 */
app.post("/ai/chart-setup/next", async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as any;
    const messages = body.messages as ChatMsg[] | undefined;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    const apiKey = getOpenAIKey();
    if (!apiKey) return res.status(500).json({ error: "Missing OpenAI key" });

    const tz = normalizeTimeZone(safeString(body.tz));
    const nowIso = new Date().toISOString();
    const truth = formatInTimeZone(nowIso, tz);

    const incomingSetup = (body.chartSetup ?? {}) as any;

    const mergedSetup = {
      status: incomingSetup.status ?? "in_progress",
      phase: incomingSetup.phase ?? "medical",
      mode: incomingSetup.mode ?? "ai",
      lastStepKey: incomingSetup.lastStepKey ?? null,
      lastQuestion: incomingSetup.lastQuestion ?? null,
      updatedAt: nowIso,
      startedAt: incomingSetup.startedAt ?? nowIso,
      dismissedUntil: incomingSetup.dismissedUntil ?? null,
      lastPromptShownAt: incomingSetup.lastPromptShownAt ?? null,
      completedAt: incomingSetup.completedAt ?? null,
    };

    const system: ChatMsg = {
      role: "system",
      content: [
        "You are MyHealthVaultAI intake wizard.",
        "Goal: collect past medical history and related chart fields via short questions.",
        "Rules:",
        "- Ask ONE question at a time.",
        "- Be concise. No long explanations.",
        "- Do not diagnose. Do not give emergency instructions.",
        "- If the user says 'none'/'no'/'n/a', record empty for that category and move on.",
        "",
        "You MUST return ONLY JSON with keys:",
        `{
          "reply": "string",
          "done": boolean,
          "phase": "medical|complete",
          "lastStepKey": "string",
          "lastQuestion": "string",
          "patch": {
            "pmh": string[],
            "psh": string[],
            "medications": { "name": string, "dose"?: string, "frequency"?: string, "route"?: string }[],
            "allergies": { "substance": string, "reaction"?: string, "severity"?: string }[],
            "familyHistory": string[],
            "socialHistory": string[],
            "goals": string[]
          }
        }`,
        "",
        `TIME_TRUTH: ${truth.date} ${truth.time} (${tz})`,
        "",
        "Flow (medical phase):",
        "1) Conditions (PMH)  2) Surgeries (PSH)  3) Medications  4) Allergies",
        "5) Family history  6) Social history  7) Goals/concerns  8) Finish",
        "",
        "IMPORTANT:",
        "- Only add items the user explicitly states.",
        "- Keep patch arrays stable (avoid duplicates).",
      ].join("\n"),
    };

    const { ok, status, data } = await callOpenAI(apiKey, {
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [system, ...messages],
      response_format: { type: "json_object" },
    });

    if (!ok) return res.status(status).json({ error: data });

    let parsed: any = {};
    const raw = String(data?.choices?.[0]?.message?.content ?? "{}");

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    const reply =
      String(parsed?.reply ?? "").trim() ||
      "Okay — what conditions have you been diagnosed with (or treated for)?";

    const phase = parsed?.phase === "complete" ? "complete" : "medical";
    const done = Boolean(parsed?.done) || phase === "complete";

    const patch =
      typeof parsed?.patch === "object" && parsed?.patch ? parsed.patch : {};

    mergedSetup.phase = phase;
    mergedSetup.status = done ? "complete" : "in_progress";
    mergedSetup.lastStepKey = safeString(parsed?.lastStepKey) ?? mergedSetup.lastStepKey;
    mergedSetup.lastQuestion = safeString(parsed?.lastQuestion) ?? reply;
    if (done && !mergedSetup.completedAt) mergedSetup.completedAt = nowIso;

    return res.json({
      reply,
      done,
      chartSetup: mergedSetup,
      patch,
    });
  } catch (e) {
    console.error("chart-setup/next error:", e);
    return res.status(500).json({ error: "Server error" });
  }
});

export const aiApi = functions
  .runWith({ secrets: ["OPENAI_API_KEY"] })
  .https.onRequest(app);
