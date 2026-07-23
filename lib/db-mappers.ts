import type { MenuItem } from "@/data/menu";
import type { RestaurantOrder, OrderStatus } from "@/lib/order-types";

export function toMenuItem(row: any): MenuItem {
  return {
    id: row.externalId ?? (Number(String(row.id).replace(/\D/g, "").slice(-8)) || 0),
    name: row.name,
    description: row.description,
    category: row.category,
    price: Number(row.price),
    emoji: row.emoji ?? "🍽️",
    imageUrl: row.imageUrl ?? undefined,
    badge: row.badge ?? undefined,
    available: row.available,
    modifierGroups: (row.modifierLinks ?? []).map((link: any) => ({
      id: link.modifierGroup.id,
      name: link.modifierGroup.name,
      required: link.modifierGroup.required,
      minSelections: link.modifierGroup.minSelections,
      maxSelections: link.modifierGroup.maxSelections,
      options: link.modifierGroup.options.map((option: any) => ({
        id: option.id,
        name: option.name,
        priceDelta: Number(option.priceDelta),
        defaultSelected: option.defaultSelected
      }))
    }))
  } as MenuItem;
}

export function toClientStatus(status: string): OrderStatus {
  return status.toLowerCase().replaceAll("_", "-") as OrderStatus;
}

export function toDbStatus(status: OrderStatus) {
  return status.toUpperCase().replaceAll("-", "_") as any;
}

export function toRestaurantOrder(row: any): RestaurantOrder {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    fulfilment: row.fulfilment.toLowerCase(),
    paymentMethod: row.paymentMethod.toLowerCase(),
    paymentStatus: row.paymentStatus?.toLowerCase().replaceAll("_", "-") ?? "not-required",
    status: toClientStatus(row.status),
    customer: {
      name: row.customerName,
      phone: row.customerPhone,
      email: row.customerEmail ?? undefined,
      address: row.address ?? undefined,
      notes: row.notes ?? undefined
    },
    items: row.items.map((item: any) => ({
      id: item.menuItem?.externalId ?? (Number(String(item.id).replace(/\D/g, "").slice(-8)) || 0),
      name: item.name,
      emoji: item.menuItem?.emoji ?? "🍽️",
      price: Number(item.unitPrice),
      quantity: item.quantity,
      modifiers: Array.isArray(item.modifiers) ? item.modifiers : undefined
    })),
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.deliveryFee),
    serviceFee: Number(row.serviceFee),
    total: Number(row.total),
    estimatedMinutes: row.estimatedMinutes
  };
}
