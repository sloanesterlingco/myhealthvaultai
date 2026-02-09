// src/features/vitals/services/healthKitService.ts

/**
 * HEALTHKIT & GOOGLE FIT SERVICE (TypeScript)
 * -------------------------------------------
 * Provides optional integrations for:
 * - Apple HealthKit (iOS)
 * - Google Fit (Android)
 *
 * Uses dynamic (lazy) imports so the app will NOT crash
 * if the libraries are not installed yet.
 */

import { Platform } from "react-native";
import type { HealthKitOptions, HealthKitSample } from "../types";

// Lazy-loaded modules (so app doesn't crash if missing)
let AppleHealthKit: any = null;
let GoogleFit: any = null;

try {
  AppleHealthKit = require("react-native-health").default;
} catch {}

try {
  GoogleFit = require("react-native-google-fit");
} catch {}

// ---------------------------------------------
// RESPONSE TYPES
// ---------------------------------------------

export interface HealthDataPoint {
  value: number;
  timestamp: string;
}

export interface BloodPressurePoint {
  systolic: number;
  diastolic: number;
  timestamp: string;
}

// ---------------------------------------------
// PERMISSION REQUEST
// ---------------------------------------------

export const healthKitService = {
  /**
   * Request permissions for reading vitals.
   * Safe on all platforms (returns false if unsupported).
   */
  requestPermissions: async (): Promise<boolean> => {
    // iOS HealthKit
    if (Platform.OS === "ios" && AppleHealthKit) {
      return new Promise((resolve, reject) => {
        AppleHealthKit.initHealthKit(
          {
            permissions: {
              read: [
                "HeartRate",
                "BloodPressureSystolic",
                "BloodPressureDiastolic",
                "OxygenSaturation",
                "BodyTemperature",
                "RespiratoryRate",
                "BodyMass",
              ],
            },
          },
          (err: any) => {
            if (err) reject(err);
            else resolve(true);
          }
        );
      });
    }

    // Android Google Fit
    if (Platform.OS === "android" && GoogleFit) {
      try {
        const opts = {
          scopes: [
            "https://www.googleapis.com/auth/fitness.body.read",
            "https://www.googleapis.com/auth/fitness.activity.read",
            "https://www.googleapis.com/auth/fitness.heart_rate.read",
            "https://www.googleapis.com/auth/fitness.sleep.read",
          ],
        };

        const auth = await GoogleFit.authorize(opts);
        return auth.success || false;
      } catch (err) {
        console.log("Google Fit Permission Error:", err);
      }
    }

    return false;
  },

  // ---------------------------------------------
  // HEART RATE
  // ---------------------------------------------

  getHeartRate: async (): Promise<HealthDataPoint[]> => {
    if (Platform.OS === "ios" && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.getHeartRateSamples(
          { startDate: oneWeekAgo() },
          (err: any, results: any[]) => {
            if (err || !results) return resolve([]);
            resolve(
              results.map((r) => ({
                value: r.value,
                timestamp: r.startDate,
              }))
            );
          }
        );
      });
    }

    if (Platform.OS === "android" && GoogleFit) {
      try {
        const results = await GoogleFit.getHeartRateSamples({
          startDate: Date.now() - WEEK_MS,
          endDate: Date.now(),
        });
        return results.map((r: any) => ({
          value: r.value,
          timestamp: r.startDate,
        }));
      } catch (err) {
        console.log("GoogleFit HR Error:", err);
      }
    }

    return [];
  },

  // ---------------------------------------------
  // BLOOD PRESSURE
  // ---------------------------------------------

  getBloodPressure: async (): Promise<BloodPressurePoint[]> => {
    if (Platform.OS === "ios" && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.getBloodPressureSamples(
          { startDate: oneWeekAgo() },
          (err: any, results: any[]) => {
            if (err || !results) return resolve([]);

            resolve(
              results.map((r) => ({
                systolic: r.bloodPressureSystolic,
                diastolic: r.bloodPressureDiastolic,
                timestamp: r.startDate,
              }))
            );
          }
        );
      });
    }

    // Google Fit does not reliably provide BP
    return [];
  },

  // ---------------------------------------------
  // BLOOD OXYGEN (SpO2)
  // ---------------------------------------------

  getSpO2: async (): Promise<HealthDataPoint[]> => {
    if (Platform.OS === "ios" && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.getOxygenSaturationSamples(
          { startDate: oneWeekAgo() },
          (err: any, results: any[]) => {
            if (err || !results) return resolve([]);
            resolve(
              results.map((r) => ({
                value: r.value,
                timestamp: r.startDate,
              }))
            );
          }
        );
      });
    }

    return [];
  },

  // ---------------------------------------------
  // RESPIRATORY RATE
  // ---------------------------------------------

  getRespiratoryRate: async (): Promise<HealthDataPoint[]> => {
    if (Platform.OS === "ios" && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.getRespiratoryRateSamples(
          { startDate: oneWeekAgo() },
          (err: any, results: any[]) => {
            if (err || !results) return resolve([]);
            resolve(
              results.map((r) => ({
                value: r.value,
                timestamp: r.startDate,
              }))
            );
          }
        );
      });
    }
    return [];
  },

  // ---------------------------------------------
  // WEIGHT
  // ---------------------------------------------

  getWeight: async (): Promise<HealthDataPoint[]> => {
    if (Platform.OS === "ios" && AppleHealthKit) {
      return new Promise((resolve) => {
        AppleHealthKit.getWeightSamples(
          { startDate: oneWeekAgo() },
          (err: any, results: any[]) => {
            if (err || !results) return resolve([]);
            resolve(
              results.map((r) => ({
                value: r.value,
                timestamp: r.startDate,
              }))
            );
          }
        );
      });
    }

    if (Platform.OS === "android" && GoogleFit) {
      try {
        const results = await GoogleFit.getWeightSamples({
          startDate: Date.now() - WEEK_MS,
          endDate: Date.now(),
        });

        return results.map((r: any) => ({
          value: r.value,
          timestamp: r.startDate,
        }));
      } catch (err) {
        console.log("GoogleFit weight error:", err);
      }
    }

    return [];
  },
};

// ---------------------------------------------
// HELPERS
// ---------------------------------------------

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function oneWeekAgo(): string {
  return new Date(Date.now() - WEEK_MS).toISOString();
}
