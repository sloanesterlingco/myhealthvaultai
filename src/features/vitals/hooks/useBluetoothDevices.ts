// src/features/vitals/hooks/useBluetoothDevices.ts

import { useEffect, useRef, useState } from "react";

/**
 * TEMP BLE DISABLED (Expo managed workflow)
 *
 * IMPORTANT:
 * - Do NOT import react-native-ble-plx anywhere in managed workflow.
 * - Do NOT import ../services/bluetoothService (Metro will prefer bluetoothService.native.ts)
 *
 * This hook preserves API shape so UI doesn't break, but scanning is disabled.
 */

export type BleDevice = {
  id: string;
  name?: string | null;
};

export interface BluetoothDevicesState {
  devices: BleDevice[];
  scanning: boolean;
  startScan: () => void;
  stopScan: () => void;
}

export const useBluetoothDevices = (): BluetoothDevicesState => {
  const [devices, setDevices] = useState<BleDevice[]>([]);
  const [scanning, setScanning] = useState(false);

  // keep the same ref structure the old code likely had
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopScan = () => {
    setScanning(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startScan = () => {
    // BLE disabled, but do not crash the app.
    // In UI you can show a banner/toast if desired.
    setDevices([]);
    setScanning(false);
  };

  useEffect(() => {
    // Auto-stop scan on unmount
    return () => {
      stopScan();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the same return shape
  return {
    devices,
    scanning,
    startScan,
    stopScan,
  };
};
