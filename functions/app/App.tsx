// src/app/App.tsx

import React, { useEffect } from "react";
import { AppState } from "react-native";
import AppNavigator from "../navigation/AppNavigator";
import { AuthProvider } from "../features/providers/AuthProvider";
import { UIProvider } from "../providers/UIProvider";
import ToastHost from "../components/ToastHost";
import * as Notifications from "expo-notifications";

import { rootNavigate } from "../navigation/RootNavigation";
import { AppRoutes, MainRoutes } from "../navigation/types";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { ensurePatientCoreOnce } from "../features/patient/services/ensurePatientCore";

function safeGetReceiveSharingIntentModule(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("react-native-receive-sharing-intent");
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

type SharedFile = {
  filePath?: string | null;
  text?: string | null;
  weblink?: string | null;
  mimeType?: string | null;
  contentUri?: string | null;
  fileName?: string | null;
  extension?: string | null;
};

const App: React.FC = () => {
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () =>
        ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        } as any),
    } as any);
  }, []);

  /**
   * ✅ Global fix for PMH/PSH/Allergies/Meds/etc:
   * Make sure patients/{uid} exists as soon as auth is ready.
   * Does NOT affect AuthProvider behavior.
   */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u?.uid) {
        void ensurePatientCoreOnce(u.uid);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const ReceiveSharingIntent = safeGetReceiveSharingIntentModule();
    if (!ReceiveSharingIntent?.getReceivedFiles) {
      console.log("Share import: module not available or missing getReceivedFiles().");
      return;
    }

    const PROTOCOL = "myhealthvaultai";

    const handleShared = (files: SharedFile[]) => {
      if (!files || files.length === 0) return;

      const first = files[0] ?? {};
      const sharedText = (first.text ?? "").trim();
      const sharedUrl = (first.weblink ?? "").trim();

      if (!sharedText && !sharedUrl) return;

      // Navigate to the import screen
      rootNavigate(AppRoutes.MAIN, {
        screen: MainRoutes.VISIT_RECORDER_IMPORT,
        params: {
          sharedText: sharedText || undefined,
          sharedUrl: sharedUrl || undefined,
          mimeType: first.mimeType ?? undefined,
          sourceApp: "share",
        },
      });

      // Clear so it doesn't re-open repeatedly
      try {
        ReceiveSharingIntent.clearReceivedFiles();
      } catch {}
    };

    const checkShared = () => {
      try {
        ReceiveSharingIntent.getReceivedFiles(
          (files: SharedFile[]) => handleShared(files),
          (_err: any) => {
            // Harmless when nothing is shared
          },
          PROTOCOL
        );
      } catch (e) {
        console.log("Share import checkShared threw:", e);
      }
    };

    let timer: any = null;

    const scheduleCheck = (delayMs: number) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        checkShared();
      }, delayMs);
    };

    if (AppState.currentState === "active") {
      scheduleCheck(1200);
    }

    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        scheduleCheck(700);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return (
    <UIProvider>
      <AuthProvider>
        <AppNavigator />
        <ToastHost />
      </AuthProvider>
    </UIProvider>
  );
};

export default App;
