// src/features/vitals/services/bluetoothService.ts
// BLE DISABLED STUB (Expo managed workflow)
//
// This file MUST NOT import "react-native-ble-plx".
// All app code should import from "../services/bluetoothService" (this file),
// not from bluetoothService.plx.ts.

export type BleDevice = {
  id: string;
  name?: string | null;
};

export const bluetoothService = {
  async startScan(_onDevice: (device: BleDevice) => void): Promise<void> {
    // no-op while BLE disabled
    return;
  },

  stopScan(): void {
    // no-op while BLE disabled
  },

  async connect(_deviceId: string): Promise<BleDevice | null> {
    // BLE disabled
    return null;
  },

  async disconnect(): Promise<void> {
    // no-op while BLE disabled
    return;
  },
};
