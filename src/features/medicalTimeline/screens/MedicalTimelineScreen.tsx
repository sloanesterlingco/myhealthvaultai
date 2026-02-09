// src/features/medicalTimeline/screens/MedicalTimelineScreen.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import ScreenContainer from "../../../ui/ScreenContainer";
import { theme } from "../../../theme";

import { MainRoutes, MainRoutesParamList } from "../../../navigation/types";
import { timelineService } from "../services/timelineService";
import type { TimelineEvent } from "../services/timelineTypes";
import { Button } from "../../../ui/Button";

type TimelineNav = NativeStackNavigationProp<MainRoutesParamList>;

export default function MedicalTimelineScreen() {
  const navigation = useNavigation<TimelineNav>();

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(async () => {
    const data = await timelineService.getEvents();
    setEvents(Array.isArray(data) ? data : []);
  }, []);

  const firstLoad = useCallback(async () => {
    try {
      setLoading(true);
      await loadEvents();
    } finally {
      setLoading(false);
    }
  }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadEvents();
    } finally {
      setRefreshing(false);
    }
  }, [loadEvents]);

  useEffect(() => {
    firstLoad();
  }, [firstLoad]);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
      return () => {};
    }, [loadEvents])
  );

  const renderItem = ({ item }: { item: TimelineEvent }) => {
    return (
      <TouchableOpacity
        style={styles.eventContainer}
        onPress={() => navigation.navigate(MainRoutes.TIMELINE_EVENT_DETAIL, { event: item })}
        activeOpacity={0.85}
      >
        <Text style={styles.eventType}>{item.type}</Text>
        <Text style={styles.eventTitle}>{item.summary}</Text>

        {!!(item as any).date ? <Text style={styles.eventDate}>{(item as any).date}</Text> : null}
        {!!item.detail ? <Text style={styles.eventDetail}>{item.detail}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <ScreenContainer
      showHeader
      title="Medical Timeline"
      scroll={false}
      contentStyle={{ padding: 0 }}
    >
      <View style={styles.topRow}>
        <Button
          label={loading ? "Loading..." : "Refresh"}
          onPress={firstLoad}
          variant="secondary"
          style={{ flex: 1 }}
          disabled={loading}
        />
        <View style={{ width: theme.spacing.sm }} />
        <Button
          label="Add"
          onPress={() => navigation.navigate(MainRoutes.ADD_TIMELINE_EVENT)}
          style={{ flex: 1 }}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No timeline events yet</Text>
              <Text style={styles.emptySub}>
                As you add vitals, records, and AI notes, we’ll automatically build a unified timeline here.
              </Text>

              <Button
                label="Add your first event"
                onPress={() => navigation.navigate(MainRoutes.ADD_TIMELINE_EVENT)}
                style={{ marginTop: theme.spacing.md }}
              />
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            events.length === 0 ? { flexGrow: 1 } : null,
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  eventContainer: {
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderLight ?? "#ddd",
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
  },
  eventType: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
    color: theme.colors.text,
  },
  eventDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  eventDetail: {
    fontSize: 13,
    marginTop: 6,
    color: theme.colors.textSecondary ?? "#444",
  },
  emptyWrap: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 320,
  },
});
