import { LabCardProps } from "../components/LabCard";
import { VitalsTrendCardProps } from "../components/VitalsTrendCard";
import { ProviderSummaryCardProps } from "../components/ProviderSummaryCard";

export type RichMessageKind =
  | "text"
  | "lab"
  | "vitals"
  | "providerSummary";

export interface RichMessageBase {
  id: string;
  role: "assistant" | "user" | "system";
  kind: RichMessageKind;
}

export interface TextRichMessage extends RichMessageBase {
  kind: "text";
  content: string;
}

export interface LabRichMessage extends RichMessageBase {
  kind: "lab";
  data: LabCardProps;
}

export interface VitalsRichMessage extends RichMessageBase {
  kind: "vitals";
  data: VitalsTrendCardProps;
}

export interface ProviderSummaryRichMessage extends RichMessageBase {
  kind: "providerSummary";
  data: ProviderSummaryCardProps;
}

/**
 * Converts an AI JSON payload into a usable RichMessage object.
 */
export const richMessageInterpreter = {
  fromAIResponse(raw: string): TextRichMessage | LabRichMessage | VitalsRichMessage | ProviderSummaryRichMessage {
    try {
      const parsed = JSON.parse(raw);

      if (parsed.type === "lab") {
        return {
          id: Date.now().toString(),
          role: "assistant",
          kind: "lab",
          data: parsed.data,
        };
      }

      if (parsed.type === "vitals") {
        return {
          id: Date.now().toString(),
          role: "assistant",
          kind: "vitals",
          data: parsed.data,
        };
      }

      if (parsed.type === "providerSummary") {
        return {
          id: Date.now().toString(),
          role: "assistant",
          kind: "providerSummary",
          data: parsed.data,
        };
      }

      // fallback → plain text
      return {
        id: Date.now().toString(),
        role: "assistant",
        kind: "text",
        content: raw,
      };
    } catch {
      // Fallback: not JSON → treat as text
      return {
        id: Date.now().toString(),
        role: "assistant",
        kind: "text",
        content: raw,
      };
    }
  },
};
