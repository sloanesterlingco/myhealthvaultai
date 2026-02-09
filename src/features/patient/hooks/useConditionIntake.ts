// src/features/patient/hooks/useConditionIntake.ts
import { useCallback, useState } from "react";
import { aiService } from "../../aiAssistant/services/aiService";
import { searchIcd10Cms } from "../../providers/services/codeLookupCmsService";
import { patientService } from "../../../services/patientService";

export function useConditionIntake(patientId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitConditionFromChat = useCallback(
    async (freeText: string): Promise<{ success: boolean }> => {
      const trimmed = (freeText ?? "").trim();
      if (!trimmed) return { success: false };

      try {
        setLoading(true);
        setError(null);

        const parsed = await aiService.parseCondition({
          patientId,
          freeText: trimmed,
        });

        // If AI didn’t provide a code, try CMS search (best effort)
        let icd10 = parsed.icd10 ?? null;
        if (!icd10 && parsed.name) {
          const hits = await searchIcd10Cms(parsed.name);
          if (hits.length) icd10 = { code: hits[0].code, display: hits[0].display };
        }

        await patientService.addCondition({
          name: parsed.name,
          description: parsed.description ?? trimmed,
          icd10Code: icd10?.code ?? "",
          icd10Display: icd10?.display ?? "",
          patientId,
        } as any);

        return { success: true };
      } catch (e: any) {
        console.log("Condition intake error:", e);
        setError(e?.message ?? "Failed to add condition");
        return { success: false };
      } finally {
        setLoading(false);
      }
    },
    [patientId]
  );

  return { submitConditionFromChat, loading, error };
}
