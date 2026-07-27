import type {
  BrainInput,
  BrainRecommendation,
  TopSeller
} from "./types";

type RecommendationContext = BrainInput & {
  liveOrders: number;
  unavailableItems: number;
  averageOrderValue: number;
  topSellers: TopSeller[];
};

export function generateRecommendations({
  menu,
  orders,
  settings,
  liveOrders,
  unavailableItems,
  averageOrderValue,
  topSellers
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
  } else if (liveOrders >= 6) {
    recommendations.push({
      id: "kitchen-pressure",
      tone: "warning",
      target: "kitchen",
      title: "Kitchen pressure is elevated",
      description: `${liveOrders} active orders are in progress. Prioritise delayed tickets and keep statuses current.`,
      actionLabel: "Open kitchen",
      confidence: 92,
      expectedImpact: "Reduce delays"
    });
  } else {
    recommendations.push({
      id: "operations-ready",
      tone: "positive",
      target: "storefront",
      title: "Restaurant is ready for new orders",
      description: liveOrders
        ? `${liveOrders} active order${liveOrders === 1 ? "" : "s"} are currently under control.`
        : "Ordering is open and there are no active orders requiring attention.",
      actionLabel: liveOrders ? "Open kitchen" : "View storefront",
      confidence: 96,
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
  } else {
    recommendations.push({
      id: "menu-availability",
      tone: "positive",
      target: "menu",
      title: "Full menu availability",
      description: `${menu.length} menu items are currently available to customers.`,
      actionLabel: "Optimise menu",
      confidence: 100,
      expectedImpact: "Maintain conversion"
    });
  }

  if (!settings.inventoryEnabled) {
    recommendations.push({
      id: "enable-inventory",
      tone: "warning",
      target: "settings",
      title: "Enable inventory intelligence",
      description: "Inventory tracking unlocks shortage alerts, waste insights and reorder recommendations.",
      actionLabel: "Enable inventory",
      confidence: 98,
      expectedImpact: "Reduce stock risk"
    });
  } else {
    recommendations.push({
      id: "inventory-review",
      tone: "positive",
      target: "inventory",
      title: "Review stock before the next rush",
      description: "Check low-stock ingredients and supplier risks before demand increases.",
      actionLabel: "Open inventory",
      confidence: 82,
      expectedImpact: "Avoid shortages"
    });
  }

  const bestSeller = topSellers[0];

  recommendations.push({
    id: "increase-order-value",
    tone: "positive",
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
