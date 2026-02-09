// src/features/vitals/services/trendAnalysisService.ts

/**
 * TREND ANALYSIS SERVICE (TypeScript)
 * -----------------------------------
 * Provides:
 * - Trend direction (up/down/steady)
 * - Min / Max
 * - Average
 * - % change
 * - Spike detection
 * - Out-of-range detection
 *
 * NOTE:
 * This file exports BOTH:
 * - named export: trendAnalysisService
 * - default export: trendAnalysisService
 * so imports never break.
 */

export type TrendDirection = "up" | "down" | "steady";

export interface BasicStats {
  min: number;
  max: number;
  avg: number;
}

export interface Spike {
  index: number;
  from: number;
  to: number;
  /** Percent change between from → to */
  change: number;
}

export interface OutOfRangePoint {
  index: number;
  value: number;
  outOfRange: boolean;
}

export interface OutOfRangeOptions {
  min?: number;
  max?: number;
}

export interface TrendAnalysisResult {
  direction: TrendDirection;
  percentChange: number;
  stats: BasicStats;
  spikes: Spike[];
  outOfRange: OutOfRangePoint[];
}

export const trendAnalysisService = {
  /**
   * Determine trend direction from numbers array.
   * Returns: "up", "down", or "steady"
   */
  getTrendDirection(values: number[] = []): TrendDirection {
    if (!values.length || values.length < 2) return "steady";

    const first = values[0];
    const last = values[values.length - 1];

    // Avoid divide-by-zero
    if (first === 0) {
      if (last > first) return "up";
      if (last < first) return "down";
      return "steady";
    }

    // ±2% is considered steady
    const change = (last - first) / first;

    if (change > 0.02) return "up";
    if (change < -0.02) return "down";
    return "steady";
  },

  /**
   * Calculate the percentage change from first to last
   */
  getPercentChange(values: number[] = []): number {
    if (!values.length || values.length < 2) return 0;

    const first = values[0];
    const last = values[values.length - 1];

    if (first === 0) return 0;

    return Number((((last - first) / first) * 100).toFixed(1));
  },

  /**
   * Get min, max, and average
   */
  getBasicStats(values: number[] = []): BasicStats {
    if (!values.length) return { min: 0, max: 0, avg: 0 };

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = Number(
      (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
    );

    return { min, max, avg };
  },

  /**
   * Detect spikes (sudden changes > 10%)
   */
  detectSpikes(values: number[] = []): Spike[] {
    const spikes: Spike[] = [];

    for (let i = 1; i < values.length; i++) {
      const prev = values[i - 1];
      const curr = values[i];
      if (prev === 0) continue;

      const changeRatio = Math.abs(curr - prev) / prev;

      if (changeRatio > 0.1) {
        spikes.push({
          index: i,
          from: prev,
          to: curr,
          change: Number((changeRatio * 100).toFixed(1)),
        });
      }
    }

    return spikes;
  },

  /**
   * Detect high/low out-of-range values based on thresholds
   */
  detectOutOfRange(
    values: number[] = [],
    { min = 0, max = 999 }: OutOfRangeOptions = {}
  ): OutOfRangePoint[] {
    return values
      .map((v, i) => ({
        index: i,
        value: v,
        outOfRange: v < min || v > max,
      }))
      .filter((entry) => entry.outOfRange);
  },

  /**
   * Full trend analysis bundle
   */
  analyzeVitals(values: number[] = [], options: OutOfRangeOptions = {}): TrendAnalysisResult {
    return {
      direction: trendAnalysisService.getTrendDirection(values),
      percentChange: trendAnalysisService.getPercentChange(values),
      stats: trendAnalysisService.getBasicStats(values),
      spikes: trendAnalysisService.detectSpikes(values),
      outOfRange: trendAnalysisService.detectOutOfRange(values, options),
    };
  },
};

// ✅ Default export too (prevents “no exported member” import issues)
export default trendAnalysisService;
