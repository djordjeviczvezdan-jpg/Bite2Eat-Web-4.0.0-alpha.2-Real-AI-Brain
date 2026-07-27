import { buildBusinessData } from "./adapters/business-data";
import { buildForecast } from "./forecast-engine";
import { calculateRestaurantHealth } from "./restaurant-health";
import { generateRecommendations } from "./recommendation-engine";
import { buildTimeline } from "./timeline-engine";
import { buildTrends } from "./trend-engine";
import type {
  BrainInput,
  RestaurantBrain,
  TopSeller
} from "./types";

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
  const businessData = buildBusinessData(input);
  const forecast = buildForecast(businessData);
  const trends = buildTrends(businessData);
  const timeline = buildTimeline(businessData, forecast);
  const health = calculateRestaurantHealth(input);
  const topSellers = buildTopSellers(input);

  const recommendations = generateRecommendations({
    ...input,
    liveOrders: businessData.activeOrders.length,
    unavailableItems: businessData.unavailableItems,
    averageOrderValue: businessData.averageOrderValue,
    topSellers,
    forecast,
    trends
  });

  const strongestSeller =
    topSellers[0]?.name ?? input.menu[0]?.name ?? "your leading item";

  return {
    generatedAt: businessData.now.toISOString(),
    revenue: businessData.revenue,
    completedRevenue: businessData.completedRevenue,
    averageOrderValue: businessData.averageOrderValue,
    totalOrders: businessData.todaysOrders.length,
    activeOrders: businessData.activeOrders.length,
    completedOrders: businessData.completedOrders.length,
    availableItems: businessData.availableItems,
    unavailableItems: businessData.unavailableItems,
    health,
    forecast,
    trends,
    timeline,
    recommendations,
    topSellers,
    strongestOpportunity: {
      title: "Increase average order value with a targeted add-on",
      description: `Promote a side or drink beside ${strongestSeller} before the next predicted peak.`,
      target: "marketing"
    }
  };
}
