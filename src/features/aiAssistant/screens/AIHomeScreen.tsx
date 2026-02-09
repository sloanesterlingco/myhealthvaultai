// src/features/aiAssistant/screens/AIHomeScreen.tsx
import React from "react";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { MainRoutes } from "../../../navigation/types";
import { theme } from "../../../theme";
import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";

type AIHomeScreenNav = NativeStackNavigationProp<any, MainRoutes.AI_HOME>;

interface Props {
  navigation: AIHomeScreenNav;
}

export default function AIHomeScreen({ navigation }: Props) {
  const goProfile = () => navigation.navigate(MainRoutes.DEMOGRAPHICS_INTRO as any);

  return (
    <ScreenContainer
      showHeader={true}
      title="OpenAI Copilot"
      headerShowLogo={false}
      headerShowAvatar={true}
      onPressAvatar={goProfile}
      headerShowSettings={false}
      scroll={true}
      contentStyle={{ paddingTop: 0 }}
    >
      <View style={styles.metaRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.metaTitle}>OpenAI Copilot</Text>
          <Text style={styles.metaSub}>Fast answers + visit-ready outputs.</Text>
        </View>

        <View style={styles.metaPill}>
          <Feather name="shield" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.metaPillText}>Private</Text>
        </View>
      </View>

      <Card style={styles.actionCard}>
        <ActionRow
          icon="message-circle"
          title="Ask Copilot"
          subtitle="Questions, symptoms, explanations, what to ask your doctor"
          onPress={() => navigation.navigate(MainRoutes.AI_CHAT)}
        />
      </Card>

      <Card style={styles.actionCard}>
        <ActionRow
          icon="file-text"
          title="Provider Summary"
          subtitle="Summarize a visit into clear action steps"
          onPress={() => navigation.navigate(MainRoutes.PROVIDER_SUMMARY)}
        />
      </Card>

      <Card style={styles.actionCard}>
        <ActionRow
          icon="clipboard"
          title="Chart Setup"
          subtitle="Build your chart so outputs are complete"
          onPress={() => navigation.navigate(MainRoutes.CHART_SETUP_INTRO as any)}
        />
      </Card>

      <View style={{ height: theme.spacing.xl }} />
    </ScreenContainer>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>
        <Feather name={icon} size={16} color={theme.colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metaTitle: { fontSize: 16, fontWeight: "900", color: theme.colors.text },
  metaSub: { marginTop: 2, fontSize: 12, color: theme.colors.textSecondary },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  metaPillText: { fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary },

  actionCard: {
    marginHorizontal: theme.spacing.lg,
    borderRadius: 16,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontSize: 14, fontWeight: "900", color: theme.colors.text },
  rowSub: { marginTop: 2, fontSize: 12, color: theme.colors.textSecondary },
});
