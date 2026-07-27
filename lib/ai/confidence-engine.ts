import type { BusinessData } from "./types";

export function calculateForecastConfidence(data: BusinessData) {
  const sampleSize = data.orders.length;
  const elapsedTradingHours = Math.max(
    0,
    data.currentHour - data.openingHour + 1
  );
  const totalTradingHours = Math.max(
    1,
    data.closingHour - data.openingHour + 1
  );
  const dayProgress = Math.min(1, elapsedTradingHours / totalTradingHours);

  let confidence =
    48 +
    Math.min(sampleSize, 40) * 0.75 +
    dayProgress * 18 +
    (data.historicalOrders.length >= 14 ? 8 : 0);

  if (sampleSize < 3) confidence -= 9;
  if (!data.acceptingOrders) confidence -= 3;

  confidence = Math.max(35, Math.min(96, Math.round(confidence)));

  return {
    confidence,
    label:
      confidence >= 80
        ? ("High" as const)
        : confidence >= 62
          ? ("Moderate" as const)
          : ("Early estimate" as const)
  };
}
