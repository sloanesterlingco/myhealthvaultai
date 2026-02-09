// src/features/medicalTimeline/screens/TimelineEventDetailScreen.tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";

import { theme } from "../../../theme";
import ScreenContainer from "../../../ui/ScreenContainer";
import { Card } from "../../../ui/Card";
import { SectionHeader } from "../../../ui/SectionHeader";
import { Button } from "../../../ui/Button";

import { MainRoutes, MainRoutesParamList } from "../../../navigation/types";
import type { TimelineEvent } from "../services/timelineTypes";

type R = RouteProp<MainRoutesParamList, MainRoutes.TIMELINE_EVENT_DETAIL>;

function formatWhen(event: TimelineEvent) {
  if ((event as any)?.date && String((event as any).date).trim().length > 0) return String((event as any).date);
  const ts = Number((event as any)?.timestamp ?? Date.now());
  return new Date(ts).toLocaleString();
}

function levelLabel(level?: string) {
  if (level === "high") return "High";
  if (level === "moderate") return "Moderate";
  return "Low";
}

export default function TimelineEventDetailScreen() {
  const navigation = useNavigation<any>();
  const { params } = useRoute<R>();

  const event = (params as any)?.event as TimelineEvent | undefined;

  if (!event) {
    return (
      <ScreenContainer showHeader title="Timeline Event" canGoBack onPressBack={() => navigation.goBack()} scroll>
        <Card>
          <Text style={styles.muted}>No event data was provided.</Text>
          <Text style={styles.muted}>Go back to the timeline and tap an event again.</Text>

          <Button
            label="Back to Timeline"
            onPress={() => navigation.goBack()}
            style={{ marginTop: theme.spacing.md }}
          />
        </Card>
      </ScreenContainer>
    );
  }

  const title = (event as any)?.title?.trim()
    ? (event as any).title
    : event.summary?.trim()
    ? event.summary
    : "Timeline Event";

  const when = formatWhen(event);

  const pillColor =
    event.type === "SAFETY_ALERT"
      ? theme.colors.danger
      : event.type === "AI_NOTE"
      ? theme.colors.info
      : event.type === "VITAL"
      ? theme.colors.brand
      : theme.colors.textMuted;

  return (
    <ScreenContainer
      showHeader
      title="Event Detail"
      subtitle="Review and validate what happened."
      canGoBack
      onPressBack={() => navigation.goBack()}
      scroll
      showAvatar
      onPressAvatar={() => navigation.navigate(MainRoutes.DEMOGRAPHICS_INTRO)}
    >
      <View style={styles.titleRow}>
        <View style={[styles.pill, { backgroundColor: pillColor }]} />
        <Text style={styles.title}>{title}</Text>
      </View>

      <Card style={styles.card}>
        <Row label="When" value={String(when)} />
        <Row label="Type" value={String(event.type ?? "N/A")} />
        <Row label="Severity" value={levelLabel((event as any)?.level)} />
      </Card>

      <SectionHeader title="Summary" />
      <Card>
        <Text style={styles.body}>{event.summary?.trim() ? event.summary : "No summary provided."}</Text>
      </Card>

      {(((event as any).detail ?? "") as string).trim() || (((event as any).notes ?? "") as string).trim() ? (
        <>
          <SectionHeader title="Details" />
          <Card>
            {!!((event as any).detail ?? "").trim() ? (
              <>
                <Text style={styles.subLabel}>Detail</Text>
                <Text style={styles.body}>{String((event as any).detail)}</Text>
              </>
            ) : null}

            {!!((event as any).notes ?? "").trim() ? (
              <>
                <View style={{ height: theme.spacing.md }} />
                <Text style={styles.subLabel}>Notes</Text>
                <Text style={styles.body}>{String((event as any).notes)}</Text>
              </>
            ) : null}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Actions" />
      <View style={styles.actionsRow}>
        <Button
          label="Back"
          onPress={() => navigation.goBack()}
          style={{ flex: 1, marginRight: theme.spacing.sm }}
        />
        <Button
          label="Add event"
          onPress={() => navigation.navigate(MainRoutes.ADD_TIMELINE_EVENT)}
          style={{ flex: 1, marginLeft: theme.spacing.sm }}
        />
      </View>
    </ScreenContainer>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  pill: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginRight: 10,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text,
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
  },
  rowLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  rowValue: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "600",
    maxWidth: "65%",
    textAlign: "right",
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  body: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: "row",
    marginBottom: theme.spacing.lg,
  },
  muted: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
