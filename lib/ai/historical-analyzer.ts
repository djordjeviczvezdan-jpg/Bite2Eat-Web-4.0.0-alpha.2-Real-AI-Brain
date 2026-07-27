import type { BusinessData, HourlyMetric, PeakWindow } from "./types";

type HistoricalProfile = {
  hourlyOrderWeights: number[];
  hourlyRevenueWeights: number[];
  peakWindows: PeakWindow[];
  sampleSize: number;
};

const DEFAULT_ORDER_WEIGHTS = [
  0, 0, 0, 0, 0, 0, 0.01, 0.02, 0.03, 0.04, 0.06, 0.09,
  0.12, 0.09, 0.05, 0.04, 0.05, 0.08, 0.11, 0.09, 0.06, 0.04, 0.01, 0.01
];

function normalize(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!total) return DEFAULT_ORDER_WEIGHTS;
  return values.map((value) => value / total);
}

function labelHour(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  return new Intl.DateTimeFormat("en-IE", {
    hour: "numeric",
    hour12: true
  }).format(new Date(2026, 0, 1, normalized));
}

function buildPeakWindows(
  weights: number[],
  predictedOrders: number,
  predictedRevenue: number
): PeakWindow[] {
  const ranked = weights
    .map((weight, hour) => ({ hour, weight }))
    .filter((item) => item.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  const selected: number[] = [];

  for (const item of ranked) {
    if (selected.every((hour) => Math.abs(hour - item.hour) >= 4)) {
      selected.push(item.hour);
    }
    if (selected.length === 2) break;
  }

  return selected
    .sort((a, b) => a - b)
    .map((hour) => {
      const combinedWeight =
        (weights[hour] ?? 0) +
        (weights[(hour + 1) % 24] ?? 0) +
        (weights[(hour + 2) % 24] ?? 0);

      return {
        startHour: hour,
        endHour: Math.min(23, hour + 2),
        label: `${labelHour(hour)}–${labelHour(Math.min(23, hour + 2))}`,
        expectedOrders: Math.max(1, Math.round(predictedOrders * combinedWeight)),
        expectedRevenue: predictedRevenue * combinedWeight,
        pressure: Math.min(100, Math.round(combinedWeight * 285))
      };
    });
}

export function analyzeHistory(
  data: BusinessData,
  predictedOrders: number,
  predictedRevenue: number
): HistoricalProfile {
  const source = data.historicalOrders.length >= 5
    ? data.historicalOrders
    : data.orders;

  const sameWeekday = source.filter((order) => order.weekday === data.weekday);
  const relevant = sameWeekday.length >= 4 ? sameWeekday : source;

  const orderBuckets = Array.from({ length: 24 }, () => 0);
  const revenueBuckets = Array.from({ length: 24 }, () => 0);

  relevant.forEach((order) => {
    orderBuckets[order.hour] += 1;
    revenueBuckets[order.hour] += order.total;
  });

  const hourlyOrderWeights = relevant.length
    ? normalize(orderBuckets.map((value, hour) => value + DEFAULT_ORDER_WEIGHTS[hour] * 3))
    : DEFAULT_ORDER_WEIGHTS;

  const hourlyRevenueWeights = relevant.length
    ? normalize(revenueBuckets.map((value, hour) => value + DEFAULT_ORDER_WEIGHTS[hour] * 60))
    : DEFAULT_ORDER_WEIGHTS;

  return {
    hourlyOrderWeights,
    hourlyRevenueWeights,
    peakWindows: buildPeakWindows(
      hourlyOrderWeights,
      predictedOrders,
      predictedRevenue
    ),
    sampleSize: relevant.length
  };
}

export function buildHourlyMetrics(
  data: BusinessData,
  predictedOrders: number,
  predictedRevenue: number,
  profile: HistoricalProfile
): HourlyMetric[] {
  const actualRevenue = Array.from({ length: 24 }, () => 0);
  const actualOrders = Array.from({ length: 24 }, () => 0);

  data.todaysOrders.forEach((order) => {
    actualRevenue[order.hour] += order.total;
    actualOrders[order.hour] += 1;
  });

  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: labelHour(hour),
    actualRevenue: actualRevenue[hour],
    forecastRevenue: predictedRevenue * profile.hourlyRevenueWeights[hour],
    actualOrders: actualOrders[hour],
    forecastOrders: predictedOrders * profile.hourlyOrderWeights[hour]
  })).filter(
    (metric) =>
      metric.hour >= Math.max(0, data.openingHour - 1) &&
      metric.hour <= Math.min(23, data.closingHour)
  );
}
