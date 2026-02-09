import { useEffect, useState } from "react";
import { timelineService } from "../services/timelineService";
import type { TimelineEvent } from "../services/timelineTypes";

export function useTimelineEventDetail(eventId: string) {
  const [event, setEvent] = useState<TimelineEvent | null>(null);

  useEffect(() => {
    async function load() {
      const list = await timelineService.getEvents();
      const found = list.find((e) => e.id === eventId) || null;
      setEvent(found);
    }
    load();
  }, [eventId]);

  return { event };
}

