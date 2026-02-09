// src/providers/AuthProvider.tsx
//
// Source of truth: src/features/providers/AuthProvider.tsx
// This file exists only to prevent legacy imports from accidentally pulling in
// an older AuthProvider that auto-signed-in anonymously on app boot.
//
// IMPORTANT:
// - We do NOT auto sign-in anonymously.
// - Anonymous sign-in is ONLY triggered by the "Continue as Guest" button.
//

export { AuthProvider, useAuth } from "../features/providers/AuthProvider";
export type { AuthContextValue } from "../features/providers/AuthProvider";
