export type CustomerSegment = "VIP" | "LOYAL" | "NEW" | "INACTIVE" | "HIGH_SPENDER";

export type CustomerMetricsInput = {
  createdAt: Date;
  orderCount: number;
  lifetimeSpend: number;
  lastOrderAt: Date | null;
};

export function customerSegments(input: CustomerMetricsInput, now = new Date()): CustomerSegment[] {
  const segments: CustomerSegment[] = [];
  const daysSinceCreated = Math.floor((now.getTime() - input.createdAt.getTime()) / 86_400_000);
  const daysSinceOrder = input.lastOrderAt
    ? Math.floor((now.getTime() - input.lastOrderAt.getTime()) / 86_400_000)
    : null;

  if (input.lifetimeSpend >= 500 || input.orderCount >= 20) segments.push("VIP");
  if (input.orderCount >= 5) segments.push("LOYAL");
  if (input.orderCount <= 1 && daysSinceCreated <= 30) segments.push("NEW");
  if (input.orderCount > 0 && daysSinceOrder !== null && daysSinceOrder >= 30) segments.push("INACTIVE");
  if (input.lifetimeSpend >= 250) segments.push("HIGH_SPENDER");

  return segments;
}

export function isRevenueOrder(order: { paymentMethod: string; paymentStatus: string; status: string }) {
  if (order.status === "CANCELLED") return false;
  if (order.paymentStatus === "FAILED" || order.paymentStatus === "REFUNDED") return false;
  return order.paymentMethod === "CASH" || order.paymentStatus === "PAID" || order.paymentStatus === "NOT_REQUIRED";
}
