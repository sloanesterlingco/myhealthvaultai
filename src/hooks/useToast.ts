// src/hooks/useToast.ts

import { useUI } from "../providers/UIProvider";

export function useToast() {
  const { showSuccess, showError, toast, clearToast } = useUI();
  return { showSuccess, showError, toast, clearToast };
}
