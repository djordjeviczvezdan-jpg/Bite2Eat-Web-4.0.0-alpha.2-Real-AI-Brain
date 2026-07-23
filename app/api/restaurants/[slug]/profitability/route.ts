import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";

type RangeKey = "today" | "7d" | "30d" | "90d";

function rangeStart(range: RangeKey, now: Date) {
  const start = new Date(now);
  if (range === "today") start.setHours(0, 0, 0, 0);
  else {
    start.setDate(start.getDate() - (Number(range.slice(0, -1)) - 1));
    start.setHours(0, 0, 0, 0);
  }
  return start;
}

function isCountedOrder(order: { paymentMethod: string; paymentStatus: string; status: string }) {
  if (order.status === "CANCELLED") return false;
  if (order.paymentStatus === "REFUNDED" || order.paymentStatus === "FAILED") return false;
  return order.paymentMethod === "CASH" || order.paymentStatus === "PAID" || order.paymentStatus === "NOT_REQUIRED";
}

function convert(quantity: number, from: string, to: string) {
  if (from === to) return quantity;
  if (from === "G" && to === "KG") return quantity / 1000;
  if (from === "KG" && to === "G") return quantity * 1000;
  if (from === "ML" && to === "L") return quantity / 1000;
  if (from === "L" && to === "ML") return quantity * 1000;
  return Number.NaN;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rawRange = new URL(request.url).searchParams.get("range") as RangeKey | null;
  const range: RangeKey = ["today", "7d", "30d", "90d"].includes(rawRange ?? "") ? rawRange! : "30d";
  const now = new Date();
  const start = rangeStart(range, now);
  const db = getDb();

  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: { id: true, name: true, inventoryEnabled: true, recipeCostingEnabled: true }
  });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  if (!restaurant.inventoryEnabled || !restaurant.recipeCostingEnabled) {
    return NextResponse.json({ error: "Recipes & automatic stock must be enabled first." }, { status: 403 });
  }

  const [orders, menuItems] = await Promise.all([
    db.order.findMany({
      where: { restaurantId: restaurant.id, createdAt: { gte: start, lte: now } },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    }),
    db.menuItem.findMany({
      where: { restaurantId: restaurant.id },
      include: { recipeIngredients: { include: { ingredient: true } } },
      orderBy: [{ category: "asc" }, { name: "asc" }]
    })
  ]);

  const recipeCostByMenuItem = new Map<string, number>();
  for (const item of menuItems) {
    const cost = item.recipeIngredients.reduce((sum, line) => {
      const converted = convert(Number(line.quantity), line.unit, line.ingredient.unit);
      return sum + (Number.isFinite(converted) ? converted * Number(line.ingredient.costPerUnit) : 0);
    }, 0);
    recipeCostByMenuItem.set(item.id, cost);
  }

  const counted = orders.filter(isCountedOrder);
  const menuMap = new Map<string, { menuItemId: string | null; name: string; sold: number; revenue: number; foodCost: number; recipeComplete: boolean }>();
  const orderRows = counted.map(order => {
    let foodCost = 0;
    let costedItems = 0;
    let totalItems = 0;
    for (const line of order.items) {
      totalItems += line.quantity;
      const key = line.menuItemId ?? `name:${line.name}`;
      const unitCost = line.menuItemId ? recipeCostByMenuItem.get(line.menuItemId) : undefined;
      const lineCost = unitCost == null ? 0 : unitCost * line.quantity;
      if (unitCost != null) costedItems += line.quantity;
      foodCost += lineCost;
      const row = menuMap.get(key) ?? { menuItemId: line.menuItemId, name: line.name, sold: 0, revenue: 0, foodCost: 0, recipeComplete: unitCost != null };
      row.sold += line.quantity;
      row.revenue += Number(line.unitPrice) * line.quantity;
      row.foodCost += lineCost;
      row.recipeComplete = row.recipeComplete && unitCost != null;
      menuMap.set(key, row);
    }
    const revenue = Number(order.total);
    const profit = revenue - foodCost;
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      createdAt: order.createdAt.toISOString(),
      revenue,
      foodCost,
      profit,
      margin: revenue ? (profit / revenue) * 100 : 0,
      costCoverage: totalItems ? (costedItems / totalItems) * 100 : 0
    };
  });

  const menuRows = [...menuMap.values()].map(row => {
    const profit = row.revenue - row.foodCost;
    return { ...row, profit, margin: row.revenue ? (profit / row.revenue) * 100 : 0 };
  });
  const popularityMedian = menuRows.length ? [...menuRows].sort((a, b) => a.sold - b.sold)[Math.floor(menuRows.length / 2)].sold : 0;
  const marginMedian = menuRows.length ? [...menuRows].sort((a, b) => a.margin - b.margin)[Math.floor(menuRows.length / 2)].margin : 0;
  const menuPerformance = menuRows.map(row => {
    const highSales = row.sold >= popularityMedian;
    const highMargin = row.margin >= marginMedian;
    const category = highSales && highMargin ? "STAR" : highSales ? "WORKHORSE" : highMargin ? "PUZZLE" : "DOG";
    return { ...row, category };
  }).sort((a, b) => b.profit - a.profit);

  const revenue = orderRows.reduce((sum, row) => sum + row.revenue, 0);
  const foodCost = orderRows.reduce((sum, row) => sum + row.foodCost, 0);
  const grossProfit = revenue - foodCost;
  const totalSoldUnits = menuPerformance.reduce((sum, row) => sum + row.sold, 0);
  const costedSoldUnits = menuPerformance.filter(row => row.recipeComplete).reduce((sum, row) => sum + row.sold, 0);

  return NextResponse.json({
    restaurantName: restaurant.name,
    range,
    generatedAt: now.toISOString(),
    summary: {
      revenue,
      foodCost,
      grossProfit,
      foodCostPercent: revenue ? (foodCost / revenue) * 100 : 0,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      orders: orderRows.length,
      costCoverage: totalSoldUnits ? (costedSoldUnits / totalSoldUnits) * 100 : 0
    },
    menuPerformance,
    recentOrders: orderRows.slice(0, 20)
  });
}
