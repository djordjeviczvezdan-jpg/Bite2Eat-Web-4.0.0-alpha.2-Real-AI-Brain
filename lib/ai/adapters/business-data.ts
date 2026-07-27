import type { BrainInput, BusinessData, NormalizedOrder } from "../types";

function parseDate(value: unknown, fallback: Date) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  return fallback;
}

function getOrderTimestamp(order: Record<string, unknown>, fallback: Date) {
  return parseDate(
    order.createdAt ??
      order.updatedAt ??
      order.timestamp ??
      order.placedAt ??
      order.date,
    fallback
  );
}

function getCustomerKey(order: Record<string, any>) {
  return (
    order.customer?.email ??
    order.customer?.phone ??
    order.customer?.name ??
    `guest-${order.id ?? order.orderNumber ?? "unknown"}`
  );
}

export function buildBusinessData({
  menu,
  orders,
  settings,
  now = new Date()
}: BrainInput): BusinessData {
  const normalizedOrders: NormalizedOrder[] = orders.map((order, index) => {
    const timestamp = getOrderTimestamp(order as unknown as Record<string, unknown>, now);
    const itemCount = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0)
      : 0;

    return {
      id: String(order.id ?? index),
      orderNumber: order.orderNumber ?? index + 1,
      timestamp,
      hour: timestamp.getHours(),
      weekday: timestamp.getDay(),
      total: Number(order.total ?? 0),
      status: String(order.status ?? "unknown"),
      itemCount,
      customerKey: getCustomerKey(order)
    };
  });

  const todayKey = now.toDateString();
  const todaysOrders = normalizedOrders.filter(
    (order) => order.timestamp.toDateString() === todayKey
  );

  // Seed/demo data often has no trustworthy timestamp. In that case,
  // treat the loaded order set as today's operating data.
  const effectiveTodayOrders = todaysOrders.length ? todaysOrders : normalizedOrders;

  const completedOrders = effectiveTodayOrders.filter(
    (order) => order.status === "completed"
  );
  const activeOrders = effectiveTodayOrders.filter(
    (order) => order.status !== "completed"
  );

  const revenue = effectiveTodayOrders.reduce((sum, order) => sum + order.total, 0);
  const completedRevenue = completedOrders.reduce(
    (sum, order) => sum + order.total,
    0
  );

  const openingHour = Number((settings as any).openingHour ?? 8);
  const closingHour = Number((settings as any).closingHour ?? 22);

  return {
    now,
    currentHour: now.getHours(),
    weekday: now.getDay(),
    openingHour: Number.isFinite(openingHour) ? openingHour : 8,
    closingHour: Number.isFinite(closingHour) ? closingHour : 22,
    orders: normalizedOrders,
    todaysOrders: effectiveTodayOrders,
    historicalOrders: normalizedOrders.filter(
      (order) => order.timestamp.toDateString() !== todayKey
    ),
    completedOrders,
    activeOrders,
    revenue,
    completedRevenue,
    averageOrderValue: effectiveTodayOrders.length
      ? revenue / effectiveTodayOrders.length
      : 0,
    availableItems: menu.filter((item) => item.available !== false).length,
    unavailableItems: menu.filter((item) => item.available === false).length,
    menuSize: menu.length,
    acceptingOrders: Boolean(settings.acceptingOrders),
    inventoryEnabled: Boolean(settings.inventoryEnabled),
    recipeCostingEnabled: Boolean(settings.recipeCostingEnabled)
  };
}
