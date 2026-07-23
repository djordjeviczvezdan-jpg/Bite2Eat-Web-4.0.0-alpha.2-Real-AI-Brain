import type { PaymentMethod, PaymentStatus } from "@prisma/client";

export type KitchenPaymentPolicy = {
  requireCardPaymentBeforeKitchen: boolean;
};

export type KitchenOrderPayment = {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
};

export function canReleaseOrderToKitchen(
  order: KitchenOrderPayment,
  restaurant: KitchenPaymentPolicy
) {
  if (order.paymentMethod === "CASH") return true;
  if (!restaurant.requireCardPaymentBeforeKitchen) return order.paymentStatus !== "FAILED";
  return order.paymentStatus === "PAID";
}
