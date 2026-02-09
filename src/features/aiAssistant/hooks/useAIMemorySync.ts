/**
 * @deprecated Replaced by AuthProvider + patientAggregationService Firestore EMR hydration.
 * This hook is kept temporarily so older screens/components still compile.
 * Do not use in new code.
 */

import { useCallback, useEffect, useState } from "react";

export function useAIMemorySync() {
  const [ready, setReady] = useState(false);
  const [error] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    // no-op (deprecated)
    setReady(true);
  }, []);

  const persist = useCallback(async () => {
    // no-op (deprecated)
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return { ready, error, hydrate, persist };
}
