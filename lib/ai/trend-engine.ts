import type {
  BusinessData,
  RestaurantTrends,
  TrendDirection,
  TrendMetric
} from "./types";

function direction(value: number, threshold = 2): TrendDirection {
  if (value > threshold) return "up";
  if (value < -threshold) return "down";
  return "stable";
}

function metric(
  label: string,
  value: number,
  unit: TrendMetric["unit"],
  explanation: string
): TrendMetric {
  return {
    label,
    value,
    unit,
    direction: direction(value),
    explanation
  };
}

export function buildTrends(data: BusinessData): RestaurantTrends {
  const midpoint = Math.max(1, Math.floor(data.orders.length / 2));
  const earlier = data.orders.slice(0, midpoint);
  const recent = data.orders.slice(midpoint);

  const revenue = (orders: typeof data.orders) =>
    orders.reduce((sum, order) => sum + order.total, 0);

  const earlierRevenue = revenue(earlier);
  const recentRevenue = revenue(recent);

  const revenueTrend = earlierRevenue
    ? ((recentRevenue - earlierRevenue) / earlierRevenue) * 100
    : recentRevenue
      ? 100
      : 0;

  const orderTrend = earlier.length
    ? ((recent.length - earlier.length) / earlier.length) * 100
    : 0;

  const earlierAov = earlier.length ? earlierRevenue / earlier.length : 0;
  const recentAov = recent.length ? recentRevenue / recent.length : data.averageOrderValue;
  const aovTrend = earlierAov
    ? ((recentAov - earlierAov) / earlierAov) * 100
    : 0;

  const uniqueCustomers = new Set(data.orders.map((order) => order.customerKey));
  const repeatDemand = data.orders.length
    ? ((data.orders.length - uniqueCustomers.size) / data.orders.length) * 100
    : 0;

  return {
    revenue: metric(
      "Revenue momentum",
      revenueTrend,
      "percent",
      revenueTrend >= 0
        ? "Recent revenue is stronger than the earlier comparison period."
        : "Recent revenue is softer than the earlier comparison period."
    ),
    orders: metric(
      "Order momentum",
      orderTrend,
      "percent",
      orderTrend >= 0
        ? "Order volume is holding or improving."
        : "Order volume has slowed."
    ),
    averageOrderValue: metric(
      "Average order value",
      aovTrend,
      "percent",
      aovTrend >= 0
        ? "Customers are spending more per order."
        : "Basket size has declined."
    ),
    repeatDemand: metric(
      "Repeat demand",
      repeatDemand,
      "percent",
      "Estimated share of orders connected to returning customer identities."
    )
  };
}
