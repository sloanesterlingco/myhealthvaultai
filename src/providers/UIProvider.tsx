// src/providers/UIProvider.tsx

import React, { createContext, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error";
type Toast = { type: ToastType; message: string } | null;

type UIContextValue = {
  // Loading
  isLoading: boolean;
  setLoading: (value: boolean) => void;
  showLoading: () => void;
  hideLoading: () => void;

  // Toast
  toast: Toast;
  showToast: (t: Toast) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  clearToast: () => void;
};

const UIContext = createContext<UIContextValue | null>(null);

/**
 * ✅ Provide a safe fallback object if something ever mounts without provider.
 * This prevents "undefined is not a function" crashes and makes errors readable.
 */
function getFallbackUI(): UIContextValue {
  return {
    isLoading: false,
    setLoading: () => {},
    showLoading: () => {},
    hideLoading: () => {},
    toast: null,
    showToast: () => {},
    showSuccess: () => {},
    showError: () => {},
    clearToast: () => {},
  };
}

/**
 * ✅ Your app expects useUI()
 */
export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  return ctx ?? getFallbackUI();
}

/**
 * ✅ Some code may call useUIContext()
 */
export function useUIContext(): UIContextValue {
  return useUI();
}

/**
 * ✅ Some codebases use a different name; export it too to avoid runtime errors.
 */
export function useUIProvider(): UIContextValue {
  return useUI();
}

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, _setLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const setLoading = (value: boolean) => _setLoading(value);
  const showLoading = () => _setLoading(true);
  const hideLoading = () => _setLoading(false);

  const showToast = (t: Toast) => setToast(t);
  const showSuccess = (message: string) => setToast({ type: "success", message });
  const showError = (message: string) => setToast({ type: "error", message });
  const clearToast = () => setToast(null);

  const value = useMemo<UIContextValue>(
    () => ({
      isLoading,
      setLoading,
      showLoading,
      hideLoading,
      toast,
      showToast,
      showSuccess,
      showError,
      clearToast,
    }),
    [isLoading, toast]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export default UIProvider;
