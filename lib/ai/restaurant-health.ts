import type { BrainInput, HealthBreakdown, RestaurantHealth } from "./types";

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function calculateRestaurantHealth({
  menu,
  orders,
  settings
}: BrainInput): RestaurantHealth {
  const liveOrders = orders.filter((order) => order.status !== "completed");
  const unavailableItems = menu.filter((item) => item.available === false).length;
  const availabilityRatio = menu.length
    ? (menu.length - unavailableItems) / menu.length
    : 1;

  const operations = clamp(
    88 +
      (settings.acceptingOrders ? 4 : -22) -
      Math.max(0, liveOrders.length - 5) * 4
  );

  const menuScore = clamp(55 + availabilityRatio * 45);

  const inventory = clamp(
    settings.inventoryEnabled
      ? settings.recipeCostingEnabled
        ? 94
        : 84
      : 58
  );

  const paidOrders = orders.filter(
    (order) =>
      order.paymentMethod === "cash" ||
      order.paymentStatus === "paid" ||
      order.paymentStatus === "refunded"
  ).length;

  const finance = clamp(
    orders.length ? 68 + (paidOrders / orders.length) * 28 : 76
  );

  const marketing = clamp(
    orders.length >= 20 ? 90 : orders.length >= 5 ? 80 : 70
  );

  const breakdown: HealthBreakdown = {
    operations,
    menu: menuScore,
    inventory,
    finance,
    marketing
  };

  const score = clamp(
    operations * 0.3 +
      menuScore * 0.22 +
      inventory * 0.18 +
      finance * 0.2 +
      marketing * 0.1
  );

  const reasons: string[] = [];

  if (!settings.acceptingOrders) reasons.push("Online ordering is paused.");
  if (unavailableItems > 0) {
    reasons.push(
      `${unavailableItems} menu item${unavailableItems === 1 ? " is" : "s are"} unavailable.`
    );
  }
  if (!settings.inventoryEnabled) {
    reasons.push("Inventory intelligence is not enabled.");
  }
  if (liveOrders.length > 5) {
    reasons.push("Kitchen workload is above the preferred operating range.");
  }
  if (reasons.length === 0) {
    reasons.push("Core restaurant systems are operating normally.");
  }

  return {
    score,
    label: score >= 85 ? "Excellent" : score >= 70 ? "Healthy" : "Needs attention",
    breakdown,
    reasons
  };
}
