// src/features/vitals/components/BluetoothDeviceCard.tsx

import React from "react";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { theme } from "../../../theme";

/**
 * TEMP BLE DISABLED (Expo managed workflow)
 * Remove all imports from react-native-ble-plx.
 */

export type BleDevice = {
  id: string;
  name?: string | null;
};

type Props = {
  device: BleDevice;
  onPress: (device: BleDevice) => void;
};

export const BluetoothDeviceCard: React.FC<Props> = ({ device, onPress }) => {
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(device)}>
      <View style={{ flex: 1 }}>
        <Text style={styles.deviceName}>{device.name || "Unknown Device"}</Text>
        <Text style={styles.deviceId}>{device.id}</Text>
      </View>

      <Feather name="chevron-right" size={20} color={theme.colors.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deviceName: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text,
  },
  deviceId: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
});
