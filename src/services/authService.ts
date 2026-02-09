// src/services/authService.ts

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../lib/firebase";

export const authService = {
  signIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  },

  signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  },

  forgotPassword(email: string) {
    return sendPasswordResetEmail(auth, email);
  },

  // -----------------------------
  // MFA placeholders (safe for now)
  // -----------------------------
  async startTwoFactorSetup(): Promise<{ secret: string; qrCode: string }> {
    return {
      secret: "ABC123-PLACEHOLDER",
      qrCode:
        "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PLACEHOLDER",
    };
  },

  async verifyTwoFactorCode(code: string): Promise<boolean> {
    if (!code || code.length < 4) {
      throw new Error("Invalid verification code");
    }
    return true;
  },
};
