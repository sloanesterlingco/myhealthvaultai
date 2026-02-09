// src/ui/ScreenContainer.tsx
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { theme } from "../theme";
import AppHeader from "./layout/AppHeader";
import { MainRoutes } from "../navigation/types";

type Props = {
  children?: React.ReactNode;

  // New API
  showHeader?: boolean;
  title?: string;
  subtitle?: string;
  canGoBack?: boolean;
  onPressBack?: () => void;

  showAvatar?: boolean;
  onPressAvatar?: () => void;

  scroll?: boolean;

  style?: ViewStyle;
  contentStyle?: ViewStyle;

  // Old API (back-compat)
  header?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
  headerCanGoBack?: boolean;

  headerShowLogo?: boolean;
  headerHideTitleWhenLogo?: boolean;

  headerShowAvatar?: boolean;

  headerShowSettings?: boolean;
  headerOnPressSettings?: () => void;
  onPressSettings?: () => void;
};

function ScreenContainerImpl({
  children,
  showHeader,
  title,
  subtitle,
  canGoBack,
  onPressBack,
  onPressAvatar,
  showAvatar,
  scroll = true,
  style,
  contentStyle,

  header,
  headerTitle,
  headerSubtitle,
  headerCanGoBack,
  headerShowLogo,
  headerHideTitleWhenLogo,
  headerShowAvatar,
  headerShowSettings,
  headerOnPressSettings,
  onPressSettings,
}: Props) {
  const navigation = useNavigation<any>();

  const resolved = useMemo(() => {
    const resolvedTitle = title ?? headerTitle ?? "";
    const resolvedSubtitle = subtitle ?? headerSubtitle ?? "";

    const resolvedCanGoBack =
      typeof canGoBack === "boolean"
        ? canGoBack
        : typeof headerCanGoBack === "boolean"
        ? headerCanGoBack
        : Boolean(navigation?.canGoBack?.());

    // ✅ AUTO HEADER:
    // If showHeader is not explicitly set and old `header` is not set,
    // show the header whenever the screen provides title/subtitle/back button.
    const resolvedShowHeader =
      typeof showHeader === "boolean"
        ? showHeader
        : typeof header === "boolean"
        ? header
        : Boolean(
            (resolvedTitle && resolvedTitle.trim().length > 0) ||
              (resolvedSubtitle && resolvedSubtitle.trim().length > 0) ||
              resolvedCanGoBack
          );

    const resolvedOnPressBack =
      onPressBack ??
      (resolvedCanGoBack && navigation?.canGoBack?.()
        ? () => navigation.goBack()
        : undefined);

    // ✅ Root-safe avatar nav
    const resolvedOnPressAvatar =
      onPressAvatar ??
      (() => {
        try {
          navigation?.navigate?.(MainRoutes.MAIN_TABS as any, {
            screen: MainRoutes.DASHBOARD_TAB,
            params: { screen: MainRoutes.PATIENT_PROFILE },
          });
          return;
        } catch {}
        try {
          const parent = (navigation as any)?.getParent?.();
          if (parent?.navigate) {
            parent.navigate(MainRoutes.DASHBOARD_TAB as any, {
              screen: MainRoutes.PATIENT_PROFILE,
            });
            return;
          }
        } catch {}
        try {
          navigation?.navigate?.(MainRoutes.PATIENT_PROFILE as any);
        } catch {}
      });

    const resolvedShowAvatar =
      typeof showAvatar === "boolean"
        ? showAvatar
        : typeof headerShowAvatar === "boolean"
        ? headerShowAvatar
        : true;

    const resolvedShowLogo = Boolean(headerShowLogo);
    const resolvedHideTitleWhenLogo =
      typeof headerHideTitleWhenLogo === "boolean"
        ? headerHideTitleWhenLogo
        : true;

    const resolvedShowSettings = Boolean(headerShowSettings);
    const resolvedOnPressSettings = headerOnPressSettings ?? onPressSettings;

    return {
      resolvedShowHeader,
      resolvedTitle,
      resolvedSubtitle,
      resolvedCanGoBack,
      resolvedOnPressBack,
      resolvedShowAvatar,
      resolvedOnPressAvatar,
      resolvedShowLogo,
      resolvedHideTitleWhenLogo,
      resolvedShowSettings,
      resolvedOnPressSettings,
    };
  }, [
    showHeader,
    header,
    title,
    subtitle,
    canGoBack,
    headerTitle,
    headerSubtitle,
    headerCanGoBack,
    onPressBack,
    onPressAvatar,
    showAvatar,
    headerShowAvatar,
    headerShowLogo,
    headerHideTitleWhenLogo,
    headerShowSettings,
    headerOnPressSettings,
    onPressSettings,
    navigation,
  ]);

  const Body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[{ padding: theme.spacing.lg }, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: theme.spacing.lg }, contentStyle]}>
      {children}
    </View>
  );

  const edges = resolved.resolvedShowHeader
    ? (["left", "right", "bottom"] as const)
    : (["top", "left", "right", "bottom"] as const);

  return (
    <SafeAreaView edges={edges} style={[styles.safe, style]}>
      {resolved.resolvedShowHeader ? (
        <AppHeader
          title={resolved.resolvedTitle}
          subtitle={resolved.resolvedSubtitle}
          canGoBack={resolved.resolvedCanGoBack}
          onPressBack={resolved.resolvedOnPressBack}
          showLogo={resolved.resolvedShowLogo}
          hideTitleWhenLogo={resolved.resolvedHideTitleWhenLogo}
          showAvatar={resolved.resolvedShowAvatar}
          onPressAvatar={resolved.resolvedOnPressAvatar}
          showSettings={resolved.resolvedShowSettings}
          onPressSettings={resolved.resolvedOnPressSettings}
        />
      ) : null}

      {Body}
    </SafeAreaView>
  );
}

// ✅ Both exports supported everywhere
export function ScreenContainer(props: Props) {
  return <ScreenContainerImpl {...props} />;
}
export default ScreenContainer;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
