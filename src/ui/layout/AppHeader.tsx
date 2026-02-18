// src/ui/layout/AppHeader.tsx
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { doc, onSnapshot } from "firebase/firestore";

import { theme } from "../../theme";
import { auth, db } from "../../lib/firebase";

type Props = {
  title?: string;
  subtitle?: string;

  canGoBack?: boolean;
  onPressBack?: () => void;

  showLogo?: boolean;
  hideTitleWhenLogo?: boolean;

  showAvatar?: boolean;
  onPressAvatar?: () => void;

  /**
   * ⚠️ DEPRECATED: We are intentionally not rendering a gear/settings icon anywhere.
   * These props are kept only so existing callers don’t break.
   */
  showSettings?: boolean;
  onPressSettings?: () => void;
};

export default function AppHeader({
  title,
  subtitle,
  canGoBack,
  onPressBack,
  showLogo,
  hideTitleWhenLogo = true,
  showAvatar = true,
  onPressAvatar,
}: Props) {
  const insets = useSafeAreaInsets();

  const effectiveShowLogo = Boolean(showLogo) && (!title || hideTitleWhenLogo);

  const uid = auth.currentUser?.uid;
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setAvatarUri(null);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "patients", uid),
      (snap) => {
        const data: any = snap.data();
        const uri = data?.avatarUrl || data?.photoUrl || data?.photoURL || null;
        setAvatarUri(typeof uri === "string" && uri.length > 0 ? uri : null);
      },
      () => setAvatarUri(null)
    );

    return () => unsub();
  }, [uid]);

  const canPressBack = Boolean(canGoBack) && typeof onPressBack === "function";
  const canPressAvatar =
    Boolean(showAvatar) && typeof onPressAvatar === "function";

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* ✅ Respect left/right safe area so avatar never clips */}
      <View
        style={[
          styles.row,
          {
            paddingLeft: theme.spacing.md + (insets.left || 0),
            paddingRight: theme.spacing.md + (insets.right || 0),
          },
        ]}
      >
        {/* Left */}
        <View style={styles.left}>
          {canGoBack ? (
            <TouchableOpacity
              onPress={onPressBack}
              disabled={!canPressBack}
              style={[styles.iconBtn, !canPressBack && { opacity: 0.4 }]}
              activeOpacity={0.85}
            >
              <Feather name="chevron-left" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconSpacer} />
          )}
        </View>

        {/* Center */}
        <View style={styles.center}>
          {effectiveShowLogo ? (
            <Image
              source={require("../../../assets/images/full_logo_original.png")}
              style={styles.logoImg}
              resizeMode="contain"
              accessibilityLabel="MyHealthVaultAI"
            />
          ) : (
            <View style={styles.titleWrap}>
              <Text style={styles.title} numberOfLines={1}>
                {title ?? ""}
              </Text>
              {!!subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* Right (Avatar ONLY) */}
        <View style={styles.right}>
          {showAvatar ? (
            <TouchableOpacity
              onPress={onPressAvatar}
              disabled={!canPressAvatar}
              style={[styles.avatarBtn, !canPressAvatar && { opacity: 0.95 }]}
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <View style={styles.avatarCircle}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                ) : (
                  <Feather name="user" size={16} color={theme.colors.text} />
                )}
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.iconSpacer} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight ?? theme.colors.border,
  },

  row: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
  },

  left: { width: 56, alignItems: "flex-start", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  right: {
    width: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.06)",
  },
  iconSpacer: { width: 36, height: 36 },

  logoImg: {
    height: 38,
    width: "100%",
    maxWidth: 260,
  },

  titleWrap: { alignItems: "center" },
  title: {
    fontSize: 16,
    fontWeight: "900",
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textSecondary,
  },

  avatarBtn: { paddingLeft: 2 },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.06)",
    overflow: "hidden",
  },
  avatarImg: { width: 34, height: 34, resizeMode: "cover" },
});
