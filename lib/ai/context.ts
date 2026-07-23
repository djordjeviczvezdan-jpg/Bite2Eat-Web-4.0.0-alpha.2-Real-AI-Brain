import { getDb } from "@/lib/db";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isRevenueOrder(order: { status: string; paymentMethod: string; paymentStatus: string }) {
  return order.status !== "CANCELLED" &&
    order.paymentStatus !== "FAILED" &&
    order.paymentStatus !== "REFUNDED" &&
    (order.paymentMethod === "CASH" || order.paymentStatus === "PAID" || order.paymentStatus === "NOT_REQUIRED");
}

export async function buildRestaurantContext(restaurantId: string) {
  const db = getDb();
  const today = startOfToday();
  const [restaurant, orders, ingredients, customers, menuItems] = await Promise.all([
    db.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, slug: true, name: true, inventoryEnabled: true, recipeCostingEnabled: true }
    }),
    db.order.findMany({
      where: { restaurantId, createdAt: { gte: today } },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    }),
    db.ingredient.findMany({
      where: { restaurantId, active: true },
      select: { name: true, unit: true, currentStock: true, reorderLevel: true },
      orderBy: { currentStock: "asc" }
    }),
    db.customer.findMany({
      where: { restaurantId },
      include: { orders: { where: { status: { not: "CANCELLED" } }, select: { total: true } } },
      take: 250
    }),
    db.menuItem.findMany({
      where: { restaurantId },
      include: { recipeIngredients: { include: { ingredient: true } } }
    })
  ]);

  if (!restaurant) throw new Error("Restaurant not found");
  const revenueOrders = orders.filter(isRevenueOrder);
  const revenue = revenueOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const itemSales = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const order of revenueOrders) {
    for (const item of order.items) {
      const key = item.menuItemId || item.name;
      const current = itemSales.get(key) || { name: item.name, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += Number(item.unitPrice) * item.quantity;
      itemSales.set(key, current);
    }
  }

  const topCustomers = customers
    .map((customer) => ({
      name: customer.name,
      loyaltyPoints: customer.loyaltyPoints,
      totalSpend: customer.orders.reduce((sum, order) => sum + Number(order.total), 0),
      orderCount: customer.orders.length
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 5);

  const lowStock = ingredients
    .filter((ingredient) => Number(ingredient.currentStock) <= Number(ingredient.reorderLevel))
    .slice(0, 10)
    .map((ingredient) => ({
      name: ingredient.name,
      unit: ingredient.unit,
      currentStock: Number(ingredient.currentStock),
      reorderLevel: Number(ingredient.reorderLevel)
    }));

  return {
    restaurant,
    today: {
      revenue,
      orders: revenueOrders.length,
      averageOrder: revenueOrders.length ? revenue / revenueOrders.length : 0
    },
    lowStock,
    topCustomers,
    bestSellers: [...itemSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5),
    menuItems: menuItems.map((item) => ({
      name: item.name,
      price: Number(item.price),
      recipeCost: item.recipeIngredients.reduce((sum, recipe) => sum + Number(recipe.quantity) * Number(recipe.ingredient.costPerUnit), 0)
    }))
  };
}
