// src/features/preVisitPack/services/preVisitPackService.ts
import type { DailyNote } from "../../dailyNotes/types";
import { dailyNotesService } from "../../dailyNotes/services/dailyNotesService";
import { sendChat, type ChatTurn } from "../../aiAssistant/services/aiService";

const CHAT_PATH = "/aiApi/ai/chat";

function clampDays(days: number) {
  if (days <= 7) return 7;
  if (days <= 14) return 14;
  return 30;
}

function buildNotesText(notes: DailyNote[]) {
  // Sort oldest -> newest so the narrative reads naturally
  const sorted = [...notes].sort((a, b) => a.createdAt - b.createdAt);

  return sorted
    .map((n) => {
      const d = new Date(n.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const tags = n.tags?.length ? ` [${n.tags.join(", ")}]` : "";
      const text = String(n.text ?? "").trim();
      return `• ${d}${tags}: ${text}`;
    })
    .join("\n");
}

export type PreVisitPackResult = {
  days: number;
  noteCount: number;
  generatedAt: number;
  content: string;
};

export const preVisitPackService = {
  async generate(daysRequested: number): Promise<PreVisitPackResult> {
    const days = clampDays(daysRequested);
    const all = await dailyNotesService.listLatest(200);

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const notes = all.filter((n) => (n.createdAt ?? 0) >= cutoff && String(n.text ?? "").trim().length > 0);

    if (!notes.length) {
      return {
        days,
        noteCount: 0,
        generatedAt: Date.now(),
        content:
          "No Daily Notes found in the selected range.\n\nAdd a quick note (symptoms, side effects, questions), then generate your Pre-Visit Pack again.",
      };
    }

    const notesText = buildNotesText(notes);

    const turns: ChatTurn[] = [
      {
        role: "system",
        content:
          "You are a patient visit-prep assistant. Create a concise Pre-Visit Pack from the user's daily notes. " +
          "Do NOT diagnose. Do NOT provide medication changes. Focus on organizing information for a doctor visit. " +
          "Use calm, clear headings and bullet points. Keep it short (aim 250–450 words).",
      },
      {
        role: "user",
        content:
          `Create a Pre-Visit Pack for my upcoming doctor visit using my Daily Notes from the last ${days} days.\n\n` +
          `Daily Notes:\n${notesText}\n\n` +
          "Output format:\n" +
          "1) One-sentence opener I can say to my doctor\n" +
          "2) Key changes since last visit\n" +
          "3) Symptoms / side effects (bullets)\n" +
          "4) Questions to ask (bullets)\n" +
          "5) Follow-ups / tests / refills to request (bullets)\n",
      },
    ];

    const replyTurns = await sendChat(CHAT_PATH, turns);

    const assistantTurn =
      replyTurns
        .slice()
        .reverse()
        .find((x: any) => x?.role === "assistant" && String(x?.content ?? "").trim().length > 0) ?? null;

    const content = String(assistantTurn?.content ?? "").trim() || "Could not generate a Pre-Visit Pack right now.";

    return {
      days,
      noteCount: notes.length,
      generatedAt: Date.now(),
      content,
    };
  },
};
