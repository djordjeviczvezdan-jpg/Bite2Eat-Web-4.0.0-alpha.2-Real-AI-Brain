import { Prisma } from "@prisma/client";

const convertToStockUnit = (quantity: number, from: string, to: string) => {
  if (from === to) return quantity;
  if (from === "G" && to === "KG") return quantity / 1000;
  if (from === "KG" && to === "G") return quantity * 1000;
  if (from === "ML" && to === "L") return quantity / 1000;
  if (from === "L" && to === "ML") return quantity * 1000;
  throw new Error(`Cannot convert ${from} to ${to}`);
};

export async function deductInventoryForCompletedOrder(db: any, orderId: string, createdBy = "Kitchen") {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      restaurant: { select: { id: true, inventoryEnabled: true, recipeCostingEnabled: true } },
      items: { include: { menuItem: { include: { recipeIngredients: { include: { ingredient: true } } } } } }
    }
  });
  if (!order?.restaurant.inventoryEnabled || !order.restaurant.recipeCostingEnabled) return;

  const deductions = new Map<string, { ingredient: any; quantity: number; itemNames: string[] }>();
  for (const item of order.items) {
    for (const line of item.menuItem?.recipeIngredients ?? []) {
      const stockQty = convertToStockUnit(Number(line.quantity) * item.quantity, line.unit, line.ingredient.unit);
      const current = deductions.get(line.ingredientId) ?? { ingredient: line.ingredient, quantity: 0, itemNames: [] };
      current.quantity += stockQty;
      current.itemNames.push(`${item.name} × ${item.quantity}`);
      deductions.set(line.ingredientId, current);
    }
  }

  await db.$transaction(async (tx: any) => {
    for (const [ingredientId, deduction] of deductions) {
      const already = await tx.stockMovement.findFirst({ where: { orderId: order.id, ingredientId, type: "ORDER_DEDUCTION" } });
      if (already) continue;
      const latest = await tx.ingredient.findUnique({ where: { id: ingredientId } });
      if (!latest) continue;
      const balance = Math.max(0, Number(latest.currentStock) - deduction.quantity);
      await tx.ingredient.update({ where: { id: ingredientId }, data: { currentStock: new Prisma.Decimal(balance) } });
      await tx.stockMovement.create({ data: {
        restaurantId: order.restaurant.id,
        ingredientId,
        orderId: order.id,
        type: "ORDER_DEDUCTION",
        quantity: new Prisma.Decimal(-deduction.quantity),
        balanceAfter: new Prisma.Decimal(balance),
        reason: `Order #${order.orderNumber} · ${deduction.itemNames.join(", ")}`,
        createdBy
      }});
    }
  });
}
