import { calculateRestaurantHealth } from "./restaurant-health";
import { generateRecommendations } from "./recommendation-engine";
import type {
  BrainInput,
  RestaurantBrain,
  TopSeller
} from "./types";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function buildTopSellers({ orders }: BrainInput): TopSeller[] {
  const sales = new Map<number, TopSeller>();

  orders.forEach((order) => {
    order.items.forEach((item) => {
      const current = sales.get(item.id) ?? {
        id: item.id,
        name: item.name,
        quantity: 0,
        revenue: 0
      };

      sales.set(item.id, {
        ...current,
        quantity: current.quantity + item.quantity,
        revenue: current.revenue + item.quantity * (item.price ?? 0)
      });
    });
  });

  return [...sales.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
}

export function buildRestaurantBrain(input: BrainInput): RestaurantBrain {
  const { menu, orders, settings } = input;

  const liveOrders = orders.filter((order) => order.status !== "completed");
  const completedOrders = orders.filter((order) => order.status === "completed");

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const completedRevenue = completedOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );

  const averageOrderValue = orders.length ? revenue / orders.length : 0;
  const availableItems = menu.filter((item) => item.available !== false).length;
  const unavailableItems = menu.length - availableItems;
  const topSellers = buildTopSellers(input);

  const kitchenPressure = clamp(liveOrders.length * 18);
  const predictedClosingRevenue = Math.max(
    revenue,
    revenue * (settings.acceptingOrders ? 1.18 : 1) +
      liveOrders.length * Math.max(averageOrderValue, 18)
  );

  const forecast = {
    predictedClosingRevenue,
    predictedOrders: Math.max(
      orders.length,
      Math.round(
        orders.length * (settings.acceptingOrders ? 1.15 : 1) +
          liveOrders.length * 0.5
      )
    ),
    confidence: clamp(58 + Math.min(orders.length, 25) * 1.4),
    kitchenPressure,
    kitchenStatus:
      kitchenPressure >= 75
        ? ("High pressure" as const)
        : kitchenPressure >= 40
          ? ("Busy" as const)
          : ("Under control" as const)
  };

  const health = calculateRestaurantHealth(input);

  const recommendations = generateRecommendations({
    ...input,
    liveOrders: liveOrders.length,
    unavailableItems,
    averageOrderValue,
    topSellers
  });

  const strongestSeller = topSellers[0]?.name ?? menu[0]?.name ?? "your leading item";

  return {
    generatedAt: new Date().toISOString(),
    revenue,
    completedRevenue,
    averageOrderValue,
    totalOrders: orders.length,
    activeOrders: liveOrders.length,
    completedOrders: completedOrders.length,
    availableItems,
    unavailableItems,
    health,
    forecast,
    recommendations,
    topSellers,
    strongestOpportunity: {
      title: "Increase average order value with a targeted add-on",
      description: `Promote a side or drink beside ${strongestSeller} to improve attachment rate without increasing order volume.`,
      target: "marketing"
    }
  };
}
