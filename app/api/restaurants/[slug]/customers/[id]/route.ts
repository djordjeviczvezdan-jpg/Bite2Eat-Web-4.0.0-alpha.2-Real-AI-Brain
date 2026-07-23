import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";
import { customerSegments, isRevenueOrder } from "@/lib/customer-crm";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurant = await getDb().restaurant.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  const customer = await getDb().customer.findFirst({
    where: { id, restaurantId: restaurant.id },
    include: {
      orders: {
        include: { items: true },
        orderBy: { createdAt: "desc" }
      },
      loyaltyTransactions: { orderBy: { createdAt: "desc" }, take: 50 }
    }
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const revenueOrders = customer.orders.filter(isRevenueOrder);
  const lifetimeSpend = revenueOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const itemTotals = new Map<string, { name: string; quantity: number; spend: number }>();
  for (const order of revenueOrders) {
    for (const item of order.items) {
      const current = itemTotals.get(item.name) ?? { name: item.name, quantity: 0, spend: 0 };
      current.quantity += item.quantity;
      current.spend += Number(item.unitPrice) * item.quantity;
      itemTotals.set(item.name, current);
    }
  }

  const favouriteItems = [...itemTotals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const lastOrderAt = customer.orders[0]?.createdAt ?? null;

  return NextResponse.json({
    restaurantName: restaurant.name,
    customer: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      loyaltyPoints: customer.loyaltyPoints,
      createdAt: customer.createdAt.toISOString(),
      orderCount: customer.orders.length,
      lifetimeSpend,
      averageOrder: revenueOrders.length ? lifetimeSpend / revenueOrders.length : 0,
      lastOrderAt: lastOrderAt?.toISOString() ?? null,
      segments: customerSegments({ createdAt: customer.createdAt, orderCount: customer.orders.length, lifetimeSpend, lastOrderAt }),
      favouriteItems
    },
    orders: customer.orders.slice(0, 30).map(order => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      fulfilment: order.fulfilment,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
      items: order.items.map(item => ({ name: item.name, quantity: item.quantity }))
    })),
    loyaltyTransactions: customer.loyaltyTransactions.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      points: transaction.points,
      description: transaction.description,
      createdAt: transaction.createdAt.toISOString(),
      orderId: transaction.orderId
    }))
  });
}
