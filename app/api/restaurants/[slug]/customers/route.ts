import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";
import { customerSegments, isRevenueOrder, type CustomerSegment } from "@/lib/customer-crm";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurant = await getDb().restaurant.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const segment = (url.searchParams.get("segment") || "ALL") as CustomerSegment | "ALL";
  const sort = url.searchParams.get("sort") || "spend";

  const customers = await getDb().customer.findMany({
    where: { restaurantId: restaurant.id },
    include: {
      orders: {
        select: { id: true, total: true, status: true, paymentMethod: true, paymentStatus: true, createdAt: true },
        orderBy: { createdAt: "desc" }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  let rows = customers.map(customer => {
    const revenueOrders = customer.orders.filter(isRevenueOrder);
    const lifetimeSpend = revenueOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const lastOrderAt = customer.orders[0]?.createdAt ?? null;
    const orderCount = customer.orders.length;
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      loyaltyPoints: customer.loyaltyPoints,
      createdAt: customer.createdAt.toISOString(),
      orderCount,
      lifetimeSpend,
      averageOrder: revenueOrders.length ? lifetimeSpend / revenueOrders.length : 0,
      lastOrderAt: lastOrderAt?.toISOString() ?? null,
      segments: customerSegments({ createdAt: customer.createdAt, orderCount, lifetimeSpend, lastOrderAt })
    };
  });

  if (search) rows = rows.filter(row => `${row.name} ${row.email ?? ""} ${row.phone ?? ""}`.toLowerCase().includes(search));
  if (segment !== "ALL") rows = rows.filter(row => row.segments.includes(segment));

  rows.sort((a, b) => {
    if (sort === "orders") return b.orderCount - a.orderCount;
    if (sort === "recent") return (b.lastOrderAt ? Date.parse(b.lastOrderAt) : 0) - (a.lastOrderAt ? Date.parse(a.lastOrderAt) : 0);
    if (sort === "points") return b.loyaltyPoints - a.loyaltyPoints;
    if (sort === "name") return a.name.localeCompare(b.name);
    return b.lifetimeSpend - a.lifetimeSpend;
  });

  const allSegments = customers.map(customer => {
    const revenueOrders = customer.orders.filter(isRevenueOrder);
    const lifetimeSpend = revenueOrders.reduce((sum, order) => sum + Number(order.total), 0);
    return customerSegments({
      createdAt: customer.createdAt,
      orderCount: customer.orders.length,
      lifetimeSpend,
      lastOrderAt: customer.orders[0]?.createdAt ?? null
    });
  });

  return NextResponse.json({
    restaurantName: restaurant.name,
    customers: rows,
    summary: {
      total: customers.length,
      vip: allSegments.filter(value => value.includes("VIP")).length,
      inactive: allSegments.filter(value => value.includes("INACTIVE")).length,
      loyaltyPoints: customers.reduce((sum, customer) => sum + customer.loyaltyPoints, 0)
    }
  });
}
