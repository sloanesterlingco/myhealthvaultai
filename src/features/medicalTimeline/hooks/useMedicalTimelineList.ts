// src/features/medicalTimeline/hooks/useMedicalTimelineList.ts

import { useEffect, useState, useCallback } from "react";
import { timelineService } from "../services/timelineService";
import type { TimelineEvent } from "../services/timelineTypes";

export function useMedicalTimelineList() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await timelineService.getEvents();
      setEvents(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    events,
    loading,
    refresh: load,
  };
}

