// src/features/profile/screens/ProfileSettingsScreen.tsx

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import ScreenContainer from "../../../ui/ScreenContainer";
import { Button } from "../../../ui/Button";
import { Card } from "../../../ui/Card";
import { theme } from "../../../theme";
import { MainRoutes } from "../../../navigation/types";
import { auth } from "../../../lib/firebase";
import { patientService } from "../../../services/patientService";

import { usePatientProfile } from "../../patient/hooks/usePatientProfile";
import { patientAggregationService } from "../../aiAssistant/services/patientAggregationService";
import { getDashboardTasks } from "../../patient/services/dashboardTasks";

export default function ProfileSettingsScreen() {
  const navigation = useNavigation<any>();

  // Profile + chart completeness
  const { profile, reloadProfile } = usePatientProfile() as any;

  // Avatar
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Pull avatar from Firestore profile when available
  useEffect(() => {
    const b64 = (profile as any)?.photoBase64;
    if (typeof b64 === "string" && b64.length > 0) {
      setPhotoBase64(b64);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      try {
        reloadProfile?.();
      } catch {
        // no-op
      }
    }, [reloadProfile])
  );

  const setupPct = useMemo(() => {
    const patient = (patientAggregationService.getPatient?.() ?? {}) as any;
    const tasks = getDashboardTasks({ patient, profile: profile ?? null }).all;

    const total = tasks.length || 1;
    const done = tasks.filter((t) => t.status === "done").length;
    return Math.round((done / total) * 100);
  }, [profile]);

  const initials = useMemo(() => {
    const email = auth.currentUser?.email ?? "";
    return (email[0] ?? "U").toUpperCase();
  }, []);

  const avatarSource = useMemo(() => {
    if (photoBase64) return { uri: `data:image/jpeg;base64,${photoBase64}` };
    return null;
  }, [photoBase64]);

  const onChangeAvatar = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Not signed in", "Please sign in to update your profile photo.");
      return;
    }

    try {
      setUploading(true);

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission required",
          "Please allow photo library access to choose a profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.45,
        base64: true,
      });

      if (result.canceled) return;

      const b64 = result.assets?.[0]?.base64;
      if (!b64) {
        Alert.alert("Could not read photo", "Please try selecting the image again.");
        return;
      }

      await patientService.updatePatientProfile({
        photoBase64: b64,
        photoURL: null,
        updatedAt: new Date().toISOString(),
      });

      setPhotoBase64(b64);
      Alert.alert("Updated", "Profile photo saved.");
      reloadProfile?.();
    } catch (e: any) {
      console.warn("Avatar save failed:", e);
      Alert.alert(
        "Upload failed",
        e?.message ? String(e.message) : "Could not save profile photo."
      );
    } finally {
      setUploading(false);
    }
  };

  const onBuildResumeChart = () => {
    navigation.navigate(MainRoutes.AI_HOME_TAB as any, {
      screen: MainRoutes.CHART_SETUP_INTRO,
    } as any);
  };

  return (
    <ScreenContainer
      showHeader
      title="Profile"
      headerShowLogo={false}
      headerCanGoBack
      headerShowAvatar={false}
      headerShowSettings={false}
      scroll
      contentStyle={{ paddingTop: 0 }}
    >
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Your profile</Text>
        <Text style={styles.pageSub}>Photo + chart completeness. Keep it simple.</Text>

        {/* Avatar */}
        <Card style={styles.card}>
          <View style={styles.avatarRow}>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={onChangeAvatar}
              disabled={uploading}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              activeOpacity={0.88}
            >
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{initials}</Text>
                </View>
              )}

              <View style={styles.editBadge}>
                <Feather name="edit-3" size={12} color="#fff" />
              </View>

              {uploading ? (
                <View style={styles.avatarLoading}>
                  <ActivityIndicator />
                </View>
              ) : null}
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.avatarTitle}>Profile photo</Text>
              <Text style={styles.avatarSubtitle}>Tap to choose a photo</Text>
            </View>
          </View>
        </Card>

        {/* Chart progress + CTA */}
        <Card style={styles.card}>
          <View style={styles.progressHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>Chart progress</Text>
              <Text style={styles.progressSub}>
                Complete your basics so summaries and check-ins are better.
              </Text>
            </View>

            <View style={styles.progressPctPill}>
              <Text style={styles.progressPctText}>{setupPct}%</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${setupPct}%` }]} />
          </View>

          <View style={{ height: theme.spacing.md }} />
          <Button label="Build / Resume chart setup" onPress={onBuildResumeChart} />
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.md,
  },

  pageTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.text,
  },
  pageSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },

  card: {
    padding: theme.spacing.lg,
  },

  /* Avatar */
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.lg,
  },
  avatarBtn: { width: 72, height: 72 },
  avatarImg: { width: 72, height: 72, borderRadius: 36 },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: "900",
    color: theme.colors.text,
  },
  avatarLoading: {
    position: "absolute",
    inset: 0,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
  },
  editBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },

  avatarTitle: { fontSize: 15, fontWeight: "900", color: theme.colors.text },
  avatarSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },

  /* Progress */
  progressHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  progressTitle: { fontSize: 15, fontWeight: "900", color: theme.colors.text },
  progressSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },

  progressPctPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.brandTint,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  progressPctText: { fontSize: 12, fontWeight: "900", color: theme.colors.text },

  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "rgba(15, 23, 42, 0.10)",
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.brand,
  },
});
