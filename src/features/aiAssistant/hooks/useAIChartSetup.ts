// src/features/aiAssistant/hooks/useAIChartSetup.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { chartSetupNext } from "../services/aiService";
import { patientAggregationService } from "../services/patientAggregationService";
import { aiChartToPatientChartService } from "../services/aiChartToPatientChartService";

type Role = "user" | "assistant" | "system";

export type ChartSetupMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

function uid() {
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

function uniqStrings(arr: any) {
  const list = Array.isArray(arr) ? arr.map((x) => String(x).trim()).filter(Boolean) : [];
  return Array.from(new Set(list));
}

function uniqByName(arr: any) {
  const list = Array.isArray(arr) ? arr : [];
  const seen = new Set<string>();
  const out: any[] = [];
  for (const item of list) {
    const name = String(item?.name ?? "").trim().toLowerCase();
    if (!name) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(item);
  }
  return out;
}

function uniqBySubstance(arr: any) {
  const list = Array.isArray(arr) ? arr : [];
  const seen = new Set<string>();
  const out: any[] = [];
  for (const item of list) {
    const sub = String(item?.substance ?? "").trim().toLowerCase();
    if (!sub) continue;
    if (seen.has(sub)) continue;
    seen.add(sub);
    out.push(item);
  }
  return out;
}

function mergePatchIntoPatient(existingPatient: any, patch: any) {
  const safe = patch && typeof patch === "object" ? patch : {};

  const merged = {
    // simple lists
    pmh: uniqStrings([...(existingPatient?.pmh ?? []), ...(safe.pmh ?? [])]),
    psh: uniqStrings([...(existingPatient?.psh ?? []), ...(safe.psh ?? [])]),
    familyHistory: uniqStrings([...(existingPatient?.familyHistory ?? []), ...(safe.familyHistory ?? [])]),
    socialHistory: uniqStrings([...(existingPatient?.socialHistory ?? []), ...(safe.socialHistory ?? [])]),
    goals: uniqStrings([...(existingPatient?.goals ?? []), ...(safe.goals ?? [])]),

    // structured lists
    medications: uniqByName([...(existingPatient?.medications ?? []), ...(safe.medications ?? [])]),
    allergies: uniqBySubstance([...(existingPatient?.allergies ?? []), ...(safe.allergies ?? [])]),
  };

  return merged;
}

export function useAIChartSetup() {
  const [messages, setMessages] = useState<ChartSetupMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ chartSetup MUST be state so the UI can update
  const [chartSetup, setChartSetup] = useState<any>(() => {
    const p = patientAggregationService.getPatient?.();
    return p?.chartSetup ?? {};
  });

  // avoid stale closure
  const messagesRef = useRef<ChartSetupMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Seed initial assistant message once
  useEffect(() => {
    if (messagesRef.current.length > 0) return;

    try {
      patientAggregationService.setChartSetupProgress?.({
        status: "in_progress",
        phase: "medical",
      } as any);

      const p = patientAggregationService.getPatient?.();
      setChartSetup(p?.chartSetup ?? {});
    } catch {}

    setMessages([
      {
        id: uid(),
        role: "assistant",
        content:
          "Let’s set up your chart. First: what conditions have you been diagnosed with (or are being treated for)?",
        createdAt: Date.now(),
      },
    ]);
  }, []);

  const markComplete = useCallback(async () => {
    try {
      patientAggregationService.setChartSetupProgress?.({
        status: "complete",
        phase: "complete",
        completedAt: new Date().toISOString(),
      } as any);
      await patientAggregationService.persistToFirestore?.();
      const p = patientAggregationService.getPatient?.();
      setChartSetup(p?.chartSetup ?? {});
    } catch {}
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = (text ?? "").trim();
      if (!trimmed || loading) return;

      const userMsg: ChartSetupMessage = {
        id: uid(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      try {
        const history = [...messagesRef.current, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const currentPatient = patientAggregationService.getPatient?.();
        const currentSetup = currentPatient?.chartSetup ?? {};

        const resp = await chartSetupNext({
          messages: history as any,
          chartSetup: currentSetup as any,
        });

        const assistantText = String(resp?.reply ?? "").trim() || "OK";

        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "assistant", content: assistantText, createdAt: Date.now() },
        ]);

        // ✅ Persist chartSetup progress snapshot (EMR doc) AND update local chartSetup state
        if (resp?.chartSetup && typeof resp.chartSetup === "object") {
          try {
            patientAggregationService.setChartSetupProgress?.({
              ...resp.chartSetup,
              status: resp?.done ? "complete" : "in_progress",
            } as any);

            const p = patientAggregationService.getPatient?.();
            setChartSetup(p?.chartSetup ?? {});
          } catch {}
        }

        // ✅ Apply patch to BOTH patient chart collections + EMR doc
        if (resp?.patch && typeof resp.patch === "object") {
          try {
            await aiChartToPatientChartService.applyPatch(resp.patch);
          } catch (e) {
            console.log("Failed to write AI patch to patient chart:", (e as any)?.message ?? e);
          }

          try {
            const latestPatient = patientAggregationService.getPatient?.() ?? {};
            const merged = mergePatchIntoPatient(latestPatient, resp.patch);

            patientAggregationService.updatePatientData(merged as any);
            await patientAggregationService.persistToFirestore?.();
          } catch (e) {
            console.log("Failed to apply chartSetup patch to EMR doc:", (e as any)?.message ?? e);
          }
        }

        // cadence
        try {
          patientAggregationService.markChartSetupPromptShown?.();
        } catch {}

        // ✅ If backend signals done, lock completion in EMR and local state
        if (resp?.done) {
          await markComplete();
        }
      } catch (e: any) {
        console.log("Chart setup send error:", e?.message ?? e);
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: "assistant",
            content: "I hit an error talking to the server. Please try again.",
            createdAt: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, markComplete]
  );

  return { messages, loading, send, chartSetup, markComplete };
}

export default useAIChartSetup;
