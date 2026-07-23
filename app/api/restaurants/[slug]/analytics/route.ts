import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";

type RangeKey = "today" | "7d" | "30d" | "90d";

function rangeStart(range: RangeKey, now: Date) {
  const start = new Date(now);
  if (range === "today") start.setHours(0, 0, 0, 0);
  else start.setDate(start.getDate() - (Number(range.slice(0, -1)) - 1));
  if (range !== "today") start.setHours(0, 0, 0, 0);
  return start;
}

function previousStart(start: Date, end: Date) {
  return new Date(start.getTime() - (end.getTime() - start.getTime()));
}

function paidOrder(order: { paymentMethod: string; paymentStatus: string; status: string }) {
  if (order.status === "CANCELLED") return false;
  if (order.paymentStatus === "REFUNDED" || order.paymentStatus === "FAILED") return false;
  return order.paymentMethod === "CASH" || order.paymentStatus === "PAID" || order.paymentStatus === "NOT_REQUIRED";
}

function percentChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawRange = new URL(request.url).searchParams.get("range") as RangeKey | null;
  const range: RangeKey = ["today", "7d", "30d", "90d"].includes(rawRange ?? "") ? rawRange! : "7d";
  const now = new Date();
  const start = rangeStart(range, now);
  const prevStart = previousStart(start, now);

  const db = getDb();
  const restaurant = await db.restaurant.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  const orders = await db.order.findMany({
    where: { restaurantId: restaurant.id, createdAt: { gte: prevStart, lte: now } },
    include: { items: true },
    orderBy: { createdAt: "asc" }
  });

  const currentAll = orders.filter(o => o.createdAt >= start);
  const previousAll = orders.filter(o => o.createdAt >= prevStart && o.createdAt < start);
  const current = currentAll.filter(paidOrder);
  const previous = previousAll.filter(paidOrder);
  const revenue = current.reduce((sum, o) => sum + Number(o.total), 0);
  const previousRevenue = previous.reduce((sum, o) => sum + Number(o.total), 0);
  const averageOrder = current.length ? revenue / current.length : 0;
  const previousAverage = previous.length ? previousRevenue / previous.length : 0;

  const completed = current.filter(o => o.status === "COMPLETED");
  const prepSamples = completed.map(o => Math.max(0, (o.updatedAt.getTime() - o.createdAt.getTime()) / 60000));
  const averagePrepMinutes = prepSamples.length ? prepSamples.reduce((a, b) => a + b, 0) / prepSamples.length : 0;

  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  current.forEach(order => order.items.forEach(item => {
    const key = item.menuItemId ?? item.name;
    const existing = itemMap.get(key) ?? { name: item.name, quantity: 0, revenue: 0 };
    existing.quantity += item.quantity;
    existing.revenue += Number(item.unitPrice) * item.quantity;
    itemMap.set(key, existing);
  }));

  const trendMap = new Map<string, { label: string; revenue: number; orders: number }>();
  if (range === "today") {
    for (let h = 0; h < 24; h++) {
      const label = `${String(h).padStart(2, "0")}:00`;
      trendMap.set(label, { label, revenue: 0, orders: 0 });
    }
    current.forEach(o => {
      const label = `${String(o.createdAt.getHours()).padStart(2, "0")}:00`;
      const bucket = trendMap.get(label)!;
      bucket.revenue += Number(o.total); bucket.orders += 1;
    });
  } else {
    const cursor = new Date(start);
    while (cursor <= now) {
      const key = cursor.toISOString().slice(0, 10);
      trendMap.set(key, { label: cursor.toLocaleDateString("en-IE", { day: "2-digit", month: "short" }), revenue: 0, orders: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    current.forEach(o => {
      const key = o.createdAt.toISOString().slice(0, 10);
      const bucket = trendMap.get(key);
      if (bucket) { bucket.revenue += Number(o.total); bucket.orders += 1; }
    });
  }

  const hourCounts = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0, revenue: 0 }));
  current.forEach(o => { hourCounts[o.createdAt.getHours()].orders += 1; hourCounts[o.createdAt.getHours()].revenue += Number(o.total); });
  const peak = [...hourCounts].sort((a, b) => b.orders - a.orders || b.revenue - a.revenue)[0];

  const customerCounts = new Map<string, number>();
  current.forEach(o => {
    const key = o.customerId ?? o.customerPhone ?? o.customerEmail ?? o.customerName;
    customerCounts.set(key, (customerCounts.get(key) ?? 0) + 1);
  });
  const repeatCustomers = [...customerCounts.values()].filter(count => count > 1).length;

  return NextResponse.json({
    restaurantName: restaurant.name,
    range,
    generatedAt: now.toISOString(),
    kpis: {
      revenue, revenueChange: percentChange(revenue, previousRevenue),
      orders: current.length, ordersChange: percentChange(current.length, previous.length),
      averageOrder, averageOrderChange: percentChange(averageOrder, previousAverage),
      averagePrepMinutes: Math.round(averagePrepMinutes * 10) / 10
    },
    trend: [...trendMap.values()],
    topItems: [...itemMap.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8),
    fulfilment: {
      delivery: current.filter(o => o.fulfilment === "DELIVERY").length,
      collection: current.filter(o => o.fulfilment === "COLLECTION").length
    },
    payments: {
      card: current.filter(o => o.paymentMethod === "CARD").length,
      cash: current.filter(o => o.paymentMethod === "CASH").length
    },
    status: {
      new: currentAll.filter(o => o.status === "NEW").length,
      preparing: currentAll.filter(o => o.status === "PREPARING").length,
      ready: currentAll.filter(o => o.status === "READY").length,
      completed: currentAll.filter(o => o.status === "COMPLETED").length,
      cancelled: currentAll.filter(o => o.status === "CANCELLED").length
    },
    customers: { unique: customerCounts.size, repeat: repeatCustomers },
    peakHour: { label: `${String(peak.hour).padStart(2, "0")}:00`, orders: peak.orders }
  });
}
