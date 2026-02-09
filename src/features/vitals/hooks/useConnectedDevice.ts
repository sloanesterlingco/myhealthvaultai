// src/features/vitals/hooks/useConnectedDevice.ts

import { useEffect, useState } from "react";
import { vitalsService } from "../services/vitalsService";
import type { VitalType } from "../types";

/**
 * TEMP BLE DISABLED (Expo managed workflow)
 *
 * - No react-native-ble-plx imports.
 * - No bluetoothService imports (Metro would resolve bluetoothService.native.ts).
 * - Keep API shape so BluetoothDeviceScreen can remain intact.
 */

export type BleDevice = {
  id: string;
  name?: string | null;
};

export type BleSubscription = {
  remove: () => void;
};

/**
 * Helper: decode BLE Base64 → string
 * (Kept for compatibility; not used while BLE is disabled)
 */
const decodeBase64 = (base64: string | null): string | null => {
  if (!base64) return null;
  try {
    // atob may not exist in all RN runtimes depending on polyfills;
    // keep behavior consistent with your prior file.
    // eslint-disable-next-line no-undef
    return atob(base64);
  } catch {
    return null;
  }
};

/**
 * Parse a decoded BLE string into vital values (kept from original intent)
 */
function parseBleValue(
  decoded: string | null
):
  | { type: VitalType; value: number }
  | { type: "bp"; systolic: number; diastolic: number }
  | null {
  if (!decoded) return null;

  const str = decoded.trim();

  if (str.startsWith("HR:")) {
    return { type: "heartRate" as VitalType, value: Number(str.replace("HR:", "")) };
  }

  if (str.startsWith("OX:")) {
    return { type: "spo2" as VitalType, value: Number(str.replace("OX:", "")) };
  }

  if (str.startsWith("WT:")) {
    return { type: "weight" as VitalType, value: Number(str.replace("WT:", "")) };
  }

  if (str.startsWith("BP:")) {
    const bp = str.replace("BP:", "");
    const [sys, dia] = bp.split("/");
    return {
      type: "bp",
      systolic: Number(sys),
      diastolic: Number(dia),
    };
  }

  return null;
}

export function useConnectedDevice() {
  const [device, setDevice] = useState<BleDevice | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [subscription, setSubscription] = useState<BleSubscription | null>(null);
  const [liveValue, setLiveValue] = useState<string | null>(null);

  // Prevent rapid duplicate writes (kept from original intent)
  const [lastSaved, setLastSaved] = useState<number>(0);

  useEffect(() => {
    return () => {
      subscription?.remove?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Connect to device (disabled)
   */
  const connect = async (deviceId: string): Promise<BleDevice | null> => {
    setConnecting(true);
    try {
      // BLE disabled: simulate “no device”
      setDevice(null);
      return null;
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Subscribe (disabled)
   */
  const subscribe = async (): Promise<boolean> => {
    // BLE disabled
    setLiveValue(null);
    return false;
  };

  /**
   * Disconnect (disabled)
   */
  const disconnect = async (): Promise<boolean> => {
    try {
      subscription?.remove?.();
      setSubscription(null);
      setDevice(null);
      setLiveValue(null);
      return true;
    } catch {
      return false;
    }
  };

  /**
   * Save a parsed value to your vitals service (kept so future BLE re-enable is easy)
   */
  const saveVitalFromBleString = async (base64: string | null) => {
    const decoded = decodeBase64(base64);
    const parsed = parseBleValue(decoded);

    if (!parsed) return;

    const now = Date.now();
    if (now - lastSaved < 1500) return; // avoid spam
    setLastSaved(now);

    try {
      if ("type" in parsed && parsed.type === "bp") {
        // optional: if you support BP structured saves, do it here
        // For now, just set a readable liveValue
        setLiveValue(`${parsed.systolic}/${parsed.diastolic}`);
        return;
      }

      setLiveValue(String(parsed.value));

      // Adjust if your vitalsService API differs. Leaving conservative:
      // Many apps use vitalsService.addVital(type, value) style.
      // If yours is different, change this one call site later.
      // @ts-expect-error – keep compatibility until we align to current vitalsService signature
      await vitalsService.addVital?.(parsed.type, parsed.value);
    } catch {
      // swallow; BLE disabled anyway
    }
  };

  return {
    device,
    connecting,
    liveValue,
    connect,
    subscribe,
    disconnect,
    // exposed helper for future BLE implementation reuse
    saveVitalFromBleString,
  };
}
