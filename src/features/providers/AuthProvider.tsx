import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { auth } from "../../lib/firebase";

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAnonymous: boolean;

  continueAsGuest: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// If user is anonymous but HAS NOT explicitly chosen "Continue as Guest",
// we sign them out so AuthGate appears.
const GUEST_OK_KEY = "MHVA_GUEST_OK";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Prevent signOut loops while we correct unexpected anonymous restore
  const correctingAnonRef = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // We handle loading below; do not set isLoading false until we validate anon state.
      (async () => {
        try {
          // If Firebase restored an anonymous user automatically, only allow it if the user
          // previously tapped "Continue as Guest".
          if (u?.isAnonymous) {
            const guestOk = await AsyncStorage.getItem(GUEST_OK_KEY);

            if (!guestOk) {
              // Anonymous user exists but user didn't choose guest explicitly -> sign out and show AuthGate
              if (!correctingAnonRef.current) {
                correctingAnonRef.current = true;
                try {
                  await fbSignOut(auth);
                } finally {
                  correctingAnonRef.current = false;
                }
              }
              setUser(null);
              setIsLoading(false);
              return;
            }
          }

          setUser(u);
          setIsLoading(false);
        } catch (e) {
          // Fail-safe: don't block UI
          setUser(u ?? null);
          setIsLoading(false);
        }
      })();
    });

    return () => unsub();
  }, []);

  async function continueAsGuest() {
    // Mark guest intent first, then sign in anonymously.
    await AsyncStorage.setItem(GUEST_OK_KEY, "1");
    if (auth.currentUser) return;
    await signInAnonymously(auth);
  }

  async function signIn(email: string, password: string) {
    // Signing in with a real account should clear guest intent.
    await AsyncStorage.removeItem(GUEST_OK_KEY);
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }

  async function signUp(email: string, password: string) {
    await AsyncStorage.removeItem(GUEST_OK_KEY);
    await createUserWithEmailAndPassword(auth, email.trim(), password);
  }

  async function signOut() {
    await AsyncStorage.removeItem(GUEST_OK_KEY);
    await fbSignOut(auth);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAnonymous: !!user?.isAnonymous,
      continueAsGuest,
      signIn,
      signUp,
      signOut,
    }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
