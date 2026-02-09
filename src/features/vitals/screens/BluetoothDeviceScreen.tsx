// src/features/vitals/screens/BluetoothDeviceScreen.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { theme } from "../../../theme";
import { BluetoothDeviceCard, BleDevice } from "../components/BluetoothDeviceCard";
import { useBluetoothDevices } from "../hooks/useBluetoothDevices";
import { useConnectedDevice } from "../hooks/useConnectedDevice";

/**
 * TEMP BLE DISABLED (Expo managed workflow)
 * - No react-native-ble-plx imports
 * - Screen remains present but informs user BLE is disabled
 */

function isBleSupported(): boolean {
  // Still keep a platform gate for future. For now always false to be explicit.
  // If you later add a dev client build, you can change this.
  return false;
}

export default function BluetoothDeviceScreen() {
  const nav = useNavigation<any>();

  const bleSupported = useMemo(() => isBleSupported(), []);
  const { devices, scanning, startScan, stopScan } = useBluetoothDevices();
  const { device, connecting, liveValue, connect, subscribe, disconnect } =
    useConnectedDevice();

  const [selected, setSelected] = useState<BleDevice | null>(null);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!bleSupported) {
      // Show once on mount
      Alert.alert(
        "Bluetooth Disabled",
        "Bluetooth (BLE) is temporarily disabled in the Expo managed build. We'll re-enable it during BLE testing using a dev client build."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = async (d: BleDevice) => {
    if (!bleSupported) return;

    setSelected(d);
    const connected = await connect(d.id);
    if (!connected) {
      Alert.alert("Connection Failed", "Unable to connect to device.");
      return;
    }
  };

  const onSubscribe = async () => {
    if (!bleSupported) return;

    const ok = await subscribe();
    if (!ok) {
      Alert.alert("Subscribe Failed", "Unable to subscribe to device.");
      return;
    }
    setSubscribed(true);
  };

  const onDisconnect = async () => {
    await disconnect();
    setSubscribed(false);
    setSelected(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Bluetooth Devices</Text>
        <View style={{ width: 36 }} />
      </View>

      {!bleSupported && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>BLE is currently disabled</Text>
          <Text style={styles.bannerText}>
            To use Bluetooth vitals devices we’ll switch to a Dev Client build later.
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, !bleSupported && styles.actionBtnDisabled]}
          onPress={bleSupported ? startScan : undefined}
          disabled={!bleSupported}
        >
          <Feather name="search" size={18} color={theme.colors.text} />
          <Text style={styles.actionBtnText}>
            {scanning ? "Scanning..." : "Scan"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, !bleSupported && styles.actionBtnDisabled]}
          onPress={bleSupported ? stopScan : undefined}
          disabled={!bleSupported}
        >
          <Feather name="square" size={18} color={theme.colors.text} />
          <Text style={styles.actionBtnText}>Stop</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <BluetoothDeviceCard device={item} onPress={onPick} />
          </View>
        )}
        ListEmptyComponent={
          <View style={{ marginTop: 18 }}>
            <Text style={styles.emptyText}>
              {bleSupported
                ? "No devices found yet. Tap Scan."
                : "BLE is disabled in this build."}
            </Text>
          </View>
        }
      />

      <View style={styles.footerPanel}>
        <Text style={styles.footerTitle}>Status</Text>
        <Text style={styles.footerText}>
          Platform: {Platform.OS} • Connecting: {String(connecting)}
        </Text>
        <Text style={styles.footerText}>
          Selected: {selected?.name || selected?.id || "None"}
        </Text>
        <Text style={styles.footerText}>
          Connected: {device?.name || device?.id || "No"}
        </Text>
        <Text style={styles.footerText}>Live: {liveValue ?? "-"}</Text>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          <TouchableOpacity
            style={[styles.primaryBtn, (!bleSupported || subscribed) && styles.primaryBtnDisabled]}
            onPress={bleSupported && !subscribed ? onSubscribe : undefined}
            disabled={!bleSupported || subscribed}
          >
            <Text style={styles.primaryBtnText}>
              {subscribed ? "Subscribed" : "Subscribe"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onDisconnect}>
            <Text style={styles.secondaryBtnText}>Disconnect</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background, padding: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { fontSize: 18, fontWeight: "800", color: theme.colors.text },
  banner: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    padding: 12,
    borderRadius: 14,
    marginVertical: 10,
  },
  bannerTitle: { fontSize: 14, fontWeight: "800", color: theme.colors.text },
  bannerText: { marginTop: 4, fontSize: 13, color: theme.colors.textMuted },
  actions: { flexDirection: "row", gap: 12, marginVertical: 10 },
  actionBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnText: { fontWeight: "700", color: theme.colors.text },
  emptyText: { color: theme.colors.textMuted, textAlign: "center" },

  footerPanel: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  footerTitle: { fontSize: 14, fontWeight: "800", color: theme.colors.text },
  footerText: { marginTop: 4, fontSize: 12.5, color: theme.colors.textMuted },

  primaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.55 },
  primaryBtnText: { color: theme.colors.background, fontWeight: "900" },

  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    alignItems: "center",
  },
  secondaryBtnText: { color: theme.colors.text, fontWeight: "800" },
});
