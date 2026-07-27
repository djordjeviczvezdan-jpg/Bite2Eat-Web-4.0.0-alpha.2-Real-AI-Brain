import type {
  BrainInput,
  BrainRecommendation,
  RestaurantForecast,
  RestaurantTrends,
  TopSeller
} from "./types";

type RecommendationContext = BrainInput & {
  liveOrders: number;
  unavailableItems: number;
  averageOrderValue: number;
  topSellers: TopSeller[];
  forecast: RestaurantForecast;
  trends: RestaurantTrends;
};

export function generateRecommendations({
  menu,
  orders,
  settings,
  liveOrders,
  unavailableItems,
  averageOrderValue,
  topSellers,
  forecast,
  trends
}: RecommendationContext): BrainRecommendation[] {
  const recommendations: BrainRecommendation[] = [];

  if (!settings.acceptingOrders) {
    recommendations.push({
      id: "reopen-ordering",
      tone: "urgent",
      target: "settings",
      title: "Online ordering is paused",
      description: "Customers cannot place new orders until ordering is reopened.",
      actionLabel: "Review settings",
      confidence: 100,
      expectedImpact: "Restore online revenue"
    });
  } else if (forecast.kitchenPressure >= 70) {
    recommendations.push({
      id: "kitchen-pressure",
      tone: "warning",
      target: "kitchen",
      title: "Prepare for elevated kitchen pressure",
      description: `The forecast engine estimates ${forecast.kitchenPressure}% pressure around the next demand peak.`,
      actionLabel: "Open kitchen",
      confidence: forecast.confidence,
      expectedImpact: "Reduce delays"
    });
  } else {
    recommendations.push({
      id: "operations-ready",
      tone: "positive",
      target: "storefront",
      title: "Operations are within the preferred range",
      description: `${liveOrders} active order${liveOrders === 1 ? "" : "s"} and ${forecast.kitchenStatus.toLowerCase()} kitchen pressure.`,
      actionLabel: liveOrders ? "Open kitchen" : "View storefront",
      confidence: forecast.confidence,
      expectedImpact: "Maintain service quality"
    });
  }

  if (unavailableItems > 0) {
    recommendations.push({
      id: "restore-menu-items",
      tone: "warning",
      target: "menu",
      title: `${unavailableItems} menu item${unavailableItems === 1 ? " is" : "s are"} unavailable`,
      description: "Review sold-out products and restore anything that is ready to sell.",
      actionLabel: "Review menu",
      confidence: 100,
      expectedImpact: "Protect conversion"
    });
  }

  if (!settings.inventoryEnabled) {
    recommendations.push({
      id: "enable-inventory",
      tone: "warning",
      target: "settings",
      title: "Enable inventory intelligence",
      description: "Inventory tracking unlocks shortage alerts, demand forecasts and reorder recommendations.",
      actionLabel: "Enable inventory",
      confidence: 98,
      expectedImpact: "Reduce stock risk"
    });
  } else {
    recommendations.push({
      id: "inventory-peak",
      tone: "positive",
      target: "inventory",
      title: "Validate stock before the next peak",
      description: forecast.peakWindows[0]
        ? `${forecast.peakWindows[0].expectedOrders} orders are expected during ${forecast.peakWindows[0].label}.`
        : "Review low-stock ingredients before demand increases.",
      actionLabel: "Open inventory",
      confidence: forecast.confidence,
      expectedImpact: "Avoid shortages"
    });
  }

  const bestSeller = topSellers[0];
  recommendations.push({
    id: "increase-order-value",
    tone: trends.averageOrderValue.direction === "down" ? "warning" : "positive",
    target: "marketing",
    title: "Increase average order value",
    description: bestSeller
      ? `Promote a side or drink beside ${bestSeller.name}. Current average order value is €${averageOrderValue.toFixed(2)}.`
      : "Create an add-on campaign once customer order data becomes available.",
    actionLabel: "Open marketing",
    confidence: orders.length >= 5 ? 84 : 62,
    expectedImpact: "Potential AOV growth"
  });

  return recommendations.slice(0, 4);
}
