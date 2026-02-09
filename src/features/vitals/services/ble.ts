export const BLE_ENABLED = false;

export type BleDevice = {
  id: string;
  name?: string | null;
};

export const ble = {
  async isSupported() {
    return false;
  },
  async startScan(_onDevice: (d: BleDevice) => void) {
    throw new Error("BLE disabled (Expo managed build)");
  },
  stopScan() {},
  async connect(_deviceId: string) {
    throw new Error("BLE disabled (Expo managed build)");
  },
  async disconnect() {},
};
