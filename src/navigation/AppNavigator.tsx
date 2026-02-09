// src/navigation/AppNavigator.tsx
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";

import AuthNavigator from "./AuthNavigator";
import MainNavigator from "./MainNavigator";

import { useAuth } from "../features/providers/AuthProvider";

// ✅ Use ONE ref everywhere (RootNavigation)
import { rootNavigationRef, rootNavigate } from "./RootNavigation";
import { MainRoutes, AppRoutes } from "./types";

// Share intent receiver
import { useShareIntent } from "expo-share-intent";
import { setPendingShareText } from "../share/pendingShare";

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    debug: false,
  });

  useEffect(() => {
    (async () => {
      try {
        if (!hasShareIntent) return;

        const text =
          (shareIntent as any)?.text ??
          (shareIntent as any)?.data?.text ??
          (shareIntent as any)?.data ??
          "";

        const cleaned = String(text || "").trim();
        if (cleaned) {
          await setPendingShareText(cleaned);
        }

        // ✅ LAND ON TIMELINE TAB + timeline root screen
        rootNavigate(AppRoutes.MAIN, {
          screen: MainRoutes.TIMELINE_TAB,
          params: { screen: MainRoutes.MEDICAL_TIMELINE },
        });

        resetShareIntent();
      } catch {
        // no-op: don't let shares crash the app
      }
    })();
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  if (isLoading) return null;

  return (
    <NavigationContainer ref={rootNavigationRef}>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
