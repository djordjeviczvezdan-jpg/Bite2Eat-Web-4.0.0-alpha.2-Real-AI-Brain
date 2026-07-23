import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { toRestaurantOrder } from "@/lib/db-mappers";
import { buildValidatedOrder } from "@/lib/order-pricing";
import { canReleaseOrderToKitchen } from "@/lib/kitchen-order-policy";
import { findOrCreateCustomer } from "@/lib/loyalty";

const include = { items: { include: { menuItem: true } } } as const;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = getDb();
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true, requireCardPaymentBeforeKitchen: true }
  });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  const orders = await db.order.findMany({
    where: { restaurantId: restaurant.id },
    include,
    orderBy: { createdAt: "desc" },
    take: 250
  });

  const kitchenView = new URL(request.url).searchParams.get("view") === "kitchen";
  const visible = kitchenView
    ? orders.filter((order: any) => canReleaseOrderToKitchen(order, restaurant as any))
    : orders;

  return NextResponse.json(visible.map(toRestaurantOrder));
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const db = getDb();
    const { slug } = await params;
    const body = await request.json();
    if (body.paymentMethod === "card") return NextResponse.json({ error: "Card orders must use secure checkout" }, { status: 400 });
    const priced = await buildValidatedOrder(db, slug, body);
    const last = await db.order.findFirst({ where: { restaurantId: priced.restaurant.id }, orderBy: { orderNumber: "desc" }, select: { orderNumber: true } });
    const orderNumber = Math.max(1000, last?.orderNumber ?? 1000) + 1;
    const customer = await findOrCreateCustomer(db, priced.restaurant.id, { name: body.customer?.name, email: body.customer?.email, phone: body.customer?.phone, address: body.customer?.address });
    const order = await db.order.create({
      data: {
        restaurantId: priced.restaurant.id,
        customerId: customer.id,
        orderNumber,
        fulfilment: priced.fulfilment,
        paymentMethod: "CASH",
        paymentStatus: "NOT_REQUIRED",
        customerName: String(body.customer?.name ?? "").trim(),
        customerPhone: String(body.customer?.phone ?? "").trim(),
        customerEmail: String(body.customer?.email ?? "").trim() || null,
        address: priced.fulfilment === "DELIVERY" ? String(body.customer?.address ?? "").trim() : null,
        notes: String(body.customer?.notes ?? "").trim() || null,
        subtotal: priced.subtotal,
        deliveryFee: priced.deliveryFee,
        serviceFee: priced.serviceFee,
        total: priced.total,
        estimatedMinutes: priced.estimatedMinutes,
        items: { create: priced.items.map(item => ({ menuItemId: item.menuItemId, name: item.name, unitPrice: item.unitPrice, quantity: item.quantity, modifiers: item.modifiers })) }
      },
      include
    });
    return NextResponse.json(toRestaurantOrder(order), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not place order" }, { status: 400 });
  }
}
