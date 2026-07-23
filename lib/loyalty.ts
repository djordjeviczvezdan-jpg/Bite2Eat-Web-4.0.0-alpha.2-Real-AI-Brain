import { PrismaClient } from "@prisma/client";

export async function findOrCreateCustomer(db: PrismaClient, restaurantId: string, customer: { name?: string; email?: string; phone?: string; address?: string }) {
  const email = String(customer.email ?? "").trim().toLowerCase() || null;
  const phone = String(customer.phone ?? "").trim() || null;
  let existing = email ? await db.customer.findFirst({ where: { restaurantId, email } }) : null;
  if (!existing && phone) existing = await db.customer.findFirst({ where: { restaurantId, phone } });
  if (existing) return db.customer.update({ where: { id: existing.id }, data: { name: customer.name || existing.name, phone: phone || existing.phone, email: email || existing.email, address: customer.address || existing.address } });
  const restaurant = await db.restaurant.findUnique({ where: { id: restaurantId }, select: { loyaltySignupBonus: true } });
  return db.customer.create({ data: { restaurantId, name: customer.name || "Customer", email, phone, address: customer.address || null, loyaltyPoints: restaurant?.loyaltySignupBonus ?? 0 } });
}

export async function awardOrderPoints(db: PrismaClient, orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { restaurant: true, customer: true } });
  if (!order || !order.customerId || !order.restaurant.loyaltyEnabled || order.paymentStatus === "FAILED" || order.paymentStatus === "REFUNDED") return;
  const exists = await db.loyaltyTransaction.findFirst({ where: { orderId, type: "EARN" } });
  if (exists) return;
  const points = Math.max(0, Math.floor(Number(order.subtotal) * order.restaurant.loyaltyPointsPerEuro));
  if (!points) return;
  await db.$transaction([
    db.loyaltyTransaction.create({ data: { restaurantId: order.restaurantId, customerId: order.customerId, orderId, type: "EARN", points, description: `Points earned on order #${order.orderNumber}` } }),
    db.customer.update({ where: { id: order.customerId }, data: { loyaltyPoints: { increment: points } } })
  ]);
}
