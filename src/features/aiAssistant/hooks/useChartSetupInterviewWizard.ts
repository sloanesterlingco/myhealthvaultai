// src/features/aiAssistant/hooks/useChartSetupInterviewWizard.ts

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { patientAggregationService } from "../services/patientAggregationService";
import { chartSetupService } from "../services/chartSetupService";
import { generateHPIFromFreeText } from "../services/hpiIntakeService";

type Role = "user" | "assistant";

export type InterviewStepKey =
  | "hpi"
  | "pmh"
  | "psh"
  | "fhx"
  | "shx"
  | "allergies"
  | "meds"
  | "done";

export type InterviewMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

type Step = {
  key: Exclude<InterviewStepKey, "done">;
  title: string;
  question: string;
};

const STEPS: Step[] = [
  {
    key: "hpi",
    title: "Symptoms / HPI",
    question:
      "What symptoms or concerns bring you in today? Include when it started, what makes it better/worse, and anything you’ve tried.",
  },
  {
    key: "pmh",
    title: "Past medical history",
    question:
      "Do you have any past medical conditions or diagnoses (for example: high blood pressure, diabetes, asthma, anxiety, etc.)?",
  },
  {
    key: "psh",
    title: "Past surgical history",
    question:
      "Have you had any surgeries or procedures? If you know the year, include it.",
  },
  {
    key: "fhx",
    title: "Family history",
    question:
      "Any family history of major medical conditions (parents/siblings)? For example: heart disease, stroke, cancer, diabetes, autoimmune disease.",
  },
  {
    key: "shx",
    title: "Social history",
    question:
      "Tell me about your social history: tobacco/vaping, alcohol, recreational drugs, occupation, and exercise.",
  },
  {
    key: "allergies",
    title: "Allergies",
    question:
      "Do you have any allergies (medications, foods, environmental)? What reaction do you get?",
  },
  {
    key: "meds",
    title: "Medications",
    question:
      "What medications, supplements, or over-the-counter meds do you take? Include dose and how often if you know it.",
  },
];

function msg(role: Role, content: string): InterviewMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: Date.now(),
  };
}

export function useChartSetupInterviewWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(false);

  const currentStep: InterviewStepKey = useMemo(() => {
    if (stepIndex >= STEPS.length) return "done";
    return STEPS[stepIndex].key;
  }, [stepIndex]);

  const isDone = currentStep === "done";

  const headerSubtitle = useMemo(() => {
    if (isDone) return "Interview complete — review & confirm to save";
    const s = STEPS[stepIndex];
    return `${stepIndex + 1}/${STEPS.length}: ${s.title}`;
  }, [isDone, stepIndex]);

  const askCurrentQuestion = useCallback(() => {
    if (stepIndex >= STEPS.length) return;
    const q = STEPS[stepIndex].question;
    setMessages((prev) => {
      // Avoid duplicating the same assistant question
      const last = prev[prev.length - 1];
      if (last?.role === "assistant" && last.content === q) return prev;
      return [...prev, msg("assistant", q)];
    });
  }, [stepIndex]);

  // On mount:
  // - Disable auto-persist so nothing writes while interviewing
  // - Mark chartSetup progress in memory
  // - Ask first question
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    try {
      patientAggregationService.setAutoPersist(false);

      patientAggregationService.setChartSetupProgress({
        status: "in_progress",
        phase: "medical",
        mode: "ai",
        lastStepKey: "hpi",
        lastQuestion: STEPS[0]?.question,
      });
    } catch {}

    setMessages([
      msg(
        "assistant",
        "Let’s build your chart with a quick interview. Nothing will be saved until you review and confirm at the end."
      ),
    ]);

    // Ask first question after intro
    setTimeout(() => {
      askCurrentQuestion();
    }, 0);
  }, [askCurrentQuestion]);

  const advance = useCallback(() => {
    setStepIndex((i) => {
      const next = i + 1;
      return next;
    });
  }, []);

  const sendAnswer = useCallback(
    async (text: string) => {
      const t = (text ?? "").trim();
      if (!t || loading || isDone) return;

      setError(null);
      setLoading(true);

      // append user message
      setMessages((prev) => [...prev, msg("user", t)]);

      try {
        // Persist nothing during interview
        // But DO build the patient model in memory

        if (currentStep === "hpi") {
          // 1) Generate structured HPI (optional but useful)
          // 2) Store as a NOTE so provider summary can include it later
          try {
            const demo = patientAggregationService.getPatient()?.demographics ?? {};
            const age = typeof (demo as any)?.age === "number" ? (demo as any).age : undefined;
            const sex = typeof (demo as any)?.sex === "string" ? (demo as any).sex : undefined;

            const hpi = await generateHPIFromFreeText({
              freeText: t,
              age,
              sex,
            });

            const cc = (hpi as any)?.chiefComplaint ? `Chief complaint: ${(hpi as any).chiefComplaint}` : "";
            const dur = (hpi as any)?.duration ? `Duration: ${(hpi as any).duration}` : "";
            const sev = (hpi as any)?.severity ? `Severity: ${(hpi as any).severity}` : "";
            const assoc = Array.isArray((hpi as any)?.associatedSymptoms) && (hpi as any).associatedSymptoms.length
              ? `Associated: ${(hpi as any).associatedSymptoms.join(", ")}`
              : "";
            const tried = Array.isArray((hpi as any)?.treatmentsTried) && (hpi as any).treatmentsTried.length
              ? `Tried: ${(hpi as any).treatmentsTried.join(", ")}`
              : "";

            const lines = [cc, dur, sev, assoc, tried].filter(Boolean);
            const noteText = lines.length
              ? `HPI (AI structured):\n${lines.join("\n")}\n\nPatient wording:\n${t}`
              : `HPI (patient wording):\n${t}`;

            patientAggregationService.addNote(noteText);
            patientAggregationService.addTimelineEvent({ title: "Symptoms / HPI captured" });
          } catch {
            // fallback: at least keep patient wording
            patientAggregationService.addNote(`HPI (patient wording):\n${t}`);
            patientAggregationService.addTimelineEvent({ title: "Symptoms / HPI captured" });
          }

          // Also let the general chart parser extract meds/allergies/etc if user mentioned them
          await chartSetupService.parseUserResponse(t);
        } else {
          // For all other steps, use the chart setup parser
          // It updates patientAggregationService in memory (autoPersist is OFF).
          await chartSetupService.parseUserResponse(t);
        }

        // Update progress markers in memory
        try {
          const nextKey =
            stepIndex + 1 < STEPS.length ? STEPS[stepIndex + 1].key : "done";

          patientAggregationService.setChartSetupProgress({
            status: nextKey === "done" ? "in_progress" : "in_progress",
            phase: nextKey === "done" ? "medical" : "medical",
            mode: "ai",
            lastStepKey: nextKey,
            lastQuestion:
              nextKey === "done"
                ? "Review & confirm"
                : STEPS[stepIndex + 1].question,
          });
        } catch {}

        // Advance wizard
        const nextIndex = stepIndex + 1;
        setStepIndex(nextIndex);

        // Ask next question (or done message)
        if (nextIndex >= STEPS.length) {
          setMessages((prev) => [
            ...prev,
            msg(
              "assistant",
              "All set. Now tap **Review & Confirm** to verify everything before saving it to your chart."
            ),
          ]);
        } else {
          const nextQ = STEPS[nextIndex].question;
          setMessages((prev) => [...prev, msg("assistant", nextQ)]);
        }
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong while processing your answer.");
        setMessages((prev) => [
          ...prev,
          msg(
            "assistant",
            "I hit a snag processing that answer. You can try again, or type a shorter version and we’ll keep moving."
          ),
        ]);
      } finally {
        setLoading(false);
      }
    },
    [currentStep, isDone, loading, stepIndex]
  );

  const resetInterview = useCallback(() => {
    try {
      patientAggregationService.setAutoPersist(true);
    } catch {}

    setStepIndex(0);
    setError(null);
    setLoading(false);
    setMessages([
      msg(
        "assistant",
        "Let’s restart. Nothing will be saved until you review and confirm at the end."
      ),
      msg("assistant", STEPS[0].question),
    ]);
  }, []);

  // IMPORTANT:
  // We do NOT re-enable autoPersist automatically on unmount,
  // because you might navigate directly to Review and then Confirm.
  // Review screen will re-enable autoPersist and persist once confirmed.

  return {
    messages,
    loading,
    error,
    isDone,
    headerSubtitle,
    currentStep,
    sendAnswer,
    resetInterview,
  };
}
