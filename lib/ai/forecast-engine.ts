import { calculateForecastConfidence } from "./confidence-engine";
import {
  analyzeHistory,
  buildHourlyMetrics
} from "./historical-analyzer";
import type {
  BusinessData,
  ForecastReason,
  RestaurantForecast
} from "./types";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function dayPartMultiplier(weekday: number) {
  if (weekday === 5 || weekday === 6) return 1.16;
  if (weekday === 0) return 1.05;
  return 1;
}

export function buildForecast(data: BusinessData): RestaurantForecast {
  const elapsedHours = Math.max(
    1,
    data.currentHour - data.openingHour + 1
  );
  const totalHours = Math.max(
    1,
    data.closingHour - data.openingHour + 1
  );
  const progress = Math.min(1, elapsedHours / totalHours);

  const observedRevenue = data.revenue;
  const observedOrders = data.todaysOrders.length;
  const aov = data.averageOrderValue || 22;

  const projectedFromVelocity =
    progress > 0.08
      ? observedRevenue / Math.max(progress, 0.18)
      : observedRevenue * 1.8;

  const baselineRevenue =
    observedRevenue +
    Math.max(0, data.activeOrders.length) * aov * 0.7 +
    Math.max(0, totalHours - elapsedHours) * Math.max(aov * 0.45, 12);

  const predictedClosingRevenue = Math.max(
    observedRevenue,
    ((projectedFromVelocity * 0.62 + baselineRevenue * 0.38) *
      dayPartMultiplier(data.weekday)) *
      (data.acceptingOrders ? 1 : 0.9)
  );

  const predictedOrders = Math.max(
    observedOrders,
    Math.round(predictedClosingRevenue / Math.max(aov, 18))
  );

  const history = analyzeHistory(
    data,
    predictedOrders,
    predictedClosingRevenue
  );

  const hourly = buildHourlyMetrics(
    data,
    predictedOrders,
    predictedClosingRevenue,
    history
  );

  const forecastRevenueToNow = hourly
    .filter((metric) => metric.hour <= data.currentHour)
    .reduce((sum, metric) => sum + metric.forecastRevenue, 0);

  const variancePercent = forecastRevenueToNow
    ? ((observedRevenue - forecastRevenueToNow) / forecastRevenueToNow) * 100
    : 0;

  const remainingPeakPressure = history.peakWindows
    .filter((window) => window.endHour >= data.currentHour)
    .reduce((max, window) => Math.max(max, window.pressure), 0);

  const kitchenPressure = clamp(
    data.activeOrders.length * 17 +
      remainingPeakPressure * 0.42 +
      (variancePercent > 8 ? 10 : 0)
  );

  const reasons: ForecastReason[] = [
    {
      label:
        variancePercent >= 0
          ? `Revenue is ${Math.abs(variancePercent).toFixed(0)}% above the current forecast pace`
          : `Revenue is ${Math.abs(variancePercent).toFixed(0)}% below the current forecast pace`,
      impact: variancePercent >= 0 ? "positive" : "negative"
    },
    {
      label:
        data.weekday === 5 || data.weekday === 6
          ? "Weekend demand uplift applied"
          : "Weekday demand pattern applied",
      impact: data.weekday === 5 || data.weekday === 6 ? "positive" : "neutral"
    },
    {
      label: `${history.sampleSize || data.orders.length} orders available for pattern analysis`,
      impact: "neutral"
    }
  ];

  const confidence = calculateForecastConfidence(data);

  return {
    predictedClosingRevenue,
    predictedOrders,
    forecastRevenueToNow,
    actualRevenueToNow: observedRevenue,
    variancePercent,
    confidence: confidence.confidence,
    confidenceLabel: confidence.label,
    kitchenPressure,
    kitchenStatus:
      kitchenPressure >= 75
        ? "High pressure"
        : kitchenPressure >= 42
          ? "Busy"
          : "Under control",
    peakWindows: history.peakWindows,
    hourly,
    reasons
  };
}
