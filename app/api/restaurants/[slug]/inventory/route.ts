// @ts-nocheck
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";

const allowedUnits = new Set(["KG", "G", "L", "ML", "PCS"]);
const allowedTypes = new Set(["RECEIVED", "ADJUSTMENT", "WASTE", "ORDER_DEDUCTION"]);
const num = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

async function context(slug: string) {
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return null;
  const restaurant = await getDb().restaurant.findUnique({ where: { slug }, select: { id: true, name: true, inventoryEnabled: true, recipeCostingEnabled: true } });
  return restaurant ? { session, restaurant } : null;
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await context(slug);
  if (!ctx) return NextResponse.json({ error: "Unauthorized or restaurant not found" }, { status: 401 });
  if (!ctx.restaurant.inventoryEnabled) return NextResponse.json({ error: "Inventory module is disabled for this restaurant" }, { status: 403 });
  const db = getDb();
  const [ingredients, suppliers, movements, menuItems] = await Promise.all([
    db.ingredient.findMany({ where: { restaurantId: ctx.restaurant.id }, include: { supplier: { select: { id: true, name: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.supplier.findMany({ where: { restaurantId: ctx.restaurant.id }, include: { _count: { select: { ingredients: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.stockMovement.findMany({ where: { restaurantId: ctx.restaurant.id }, include: { ingredient: { select: { name: true, unit: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.menuItem.findMany({ where: { restaurantId: ctx.restaurant.id }, include: { recipeIngredients: true }, orderBy: [{ category: "asc" }, { name: "asc" }] })
  ]);
  const mapped = ingredients.map((i) => ({ ...i, currentStock: Number(i.currentStock), minimumStock: Number(i.minimumStock), reorderLevel: Number(i.reorderLevel), costPerUnit: Number(i.costPerUnit) }));
  const inventoryValue = mapped.reduce((sum, i) => sum + i.currentStock * i.costPerUnit, 0);
  return NextResponse.json({ restaurantName: ctx.restaurant.name, recipeCostingEnabled: ctx.restaurant.recipeCostingEnabled, menuItems: menuItems.map(m => ({ ...m, price: Number(m.price), recipeIngredients: m.recipeIngredients.map(r => ({ ...r, quantity: Number(r.quantity) })) })), ingredients: mapped, suppliers, movements: movements.map(m => ({ ...m, quantity: Number(m.quantity), balanceAfter: Number(m.balanceAfter) })), summary: { ingredients: mapped.length, suppliers: suppliers.filter(s => s.active).length, lowStock: mapped.filter(i => i.active && i.currentStock > 0 && i.currentStock <= i.reorderLevel).length, outOfStock: mapped.filter(i => i.active && i.currentStock <= 0).length, inventoryValue } });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await context(slug);
  if (!ctx) return NextResponse.json({ error: "Unauthorized or restaurant not found" }, { status: 401 });
  if (!ctx.restaurant.inventoryEnabled) return NextResponse.json({ error: "Inventory module is disabled for this restaurant" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const db = getDb();
  try {
    if (body.action === "recipe") {
      if (!ctx.restaurant.recipeCostingEnabled) return NextResponse.json({ error: "Recipes module is disabled for this restaurant" }, { status: 403 });
      const menuItem = await db.menuItem.findFirst({ where: { id: body.menuItemId, restaurantId: ctx.restaurant.id } });
      if (!menuItem) return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
      const lines = Array.isArray(body.lines) ? body.lines : [];
      const ids = [...new Set(lines.map((line: any) => String(line.ingredientId || "")).filter(Boolean))];
      const validIngredients = await db.ingredient.findMany({ where: { restaurantId: ctx.restaurant.id, id: { in: ids }, active: true } });
      if (validIngredients.length !== ids.length) return NextResponse.json({ error: "One or more ingredients are invalid" }, { status: 400 });
      await db.$transaction(async tx => {
        await tx.recipeIngredient.deleteMany({ where: { menuItemId: menuItem.id } });
        for (const line of lines) {
          const ingredient = validIngredients.find(i => i.id === line.ingredientId);
          const quantity = num(line.quantity);
          const unit = String(line.unit || ingredient?.unit || "PCS");
          const compatible = ingredient && (unit === ingredient.unit || (["KG","G"].includes(unit) && ["KG","G"].includes(ingredient.unit)) || (["L","ML"].includes(unit) && ["L","ML"].includes(ingredient.unit)));
          if (!ingredient || quantity <= 0 || !allowedUnits.has(unit) || !compatible) throw new Error("Each recipe line needs a valid quantity and compatible unit");
          await tx.recipeIngredient.create({ data: { restaurantId: ctx.restaurant.id, menuItemId: menuItem.id, ingredientId: ingredient.id, quantity: new Prisma.Decimal(quantity), unit: unit as any } });
        }
      });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "supplier") {
      if (!String(body.name || "").trim()) return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
      const supplier = await db.supplier.create({ data: { restaurantId: ctx.restaurant.id, name: String(body.name).trim(), contactName: String(body.contactName || "").trim() || null, email: String(body.email || "").trim() || null, phone: String(body.phone || "").trim() || null, leadTimeDays: Math.max(0, Math.round(num(body.leadTimeDays))), notes: String(body.notes || "").trim() || null } });
      return NextResponse.json({ ok: true, supplier });
    }
    if (body.action === "ingredient") {
      const name = String(body.name || "").trim();
      const unit = String(body.unit || "PCS");
      if (!name || !allowedUnits.has(unit)) return NextResponse.json({ error: "Valid ingredient name and unit are required" }, { status: 400 });
      const starting = Math.max(0, num(body.currentStock));
      const ingredient = await db.$transaction(async tx => {
        const created = await tx.ingredient.create({ data: { restaurantId: ctx.restaurant.id, supplierId: body.supplierId || null, name, category: String(body.category || "Other").trim() || "Other", unit: unit as any, currentStock: new Prisma.Decimal(starting), minimumStock: new Prisma.Decimal(Math.max(0, num(body.minimumStock))), reorderLevel: new Prisma.Decimal(Math.max(0, num(body.reorderLevel))), costPerUnit: new Prisma.Decimal(Math.max(0, num(body.costPerUnit))) } });
        if (starting > 0) await tx.stockMovement.create({ data: { restaurantId: ctx.restaurant.id, ingredientId: created.id, type: "RECEIVED", quantity: new Prisma.Decimal(starting), balanceAfter: new Prisma.Decimal(starting), reason: "Opening stock", createdBy: ctx.session.name } });
        return created;
      });
      return NextResponse.json({ ok: true, ingredient });
    }
    if (body.action === "movement") {
      const type = String(body.type || "ADJUSTMENT");
      if (!allowedTypes.has(type)) return NextResponse.json({ error: "Invalid movement type" }, { status: 400 });
      const quantityInput = num(body.quantity);
      if (!body.ingredientId || quantityInput === 0) return NextResponse.json({ error: "Ingredient and non-zero quantity are required" }, { status: 400 });
      const result = await db.$transaction(async tx => {
        const ingredient = await tx.ingredient.findFirst({ where: { id: body.ingredientId, restaurantId: ctx.restaurant.id } });
        if (!ingredient) throw new Error("Ingredient not found");
        const signed = type === "WASTE" || type === "ORDER_DEDUCTION" ? -Math.abs(quantityInput) : type === "RECEIVED" ? Math.abs(quantityInput) : quantityInput;
        const balance = Math.max(0, Number(ingredient.currentStock) + signed);
        await tx.ingredient.update({ where: { id: ingredient.id }, data: { currentStock: new Prisma.Decimal(balance) } });
        return tx.stockMovement.create({ data: { restaurantId: ctx.restaurant.id, ingredientId: ingredient.id, type: type as any, quantity: new Prisma.Decimal(signed), balanceAfter: new Prisma.Decimal(balance), reason: String(body.reason || "").trim() || null, createdBy: ctx.session.name } });
      });
      return NextResponse.json({ ok: true, movement: result });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.code === "P2002" ? "That name already exists" : error?.message || "Could not save inventory record" }, { status: 400 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await context(slug);
  if (!ctx) return NextResponse.json({ error: "Unauthorized or restaurant not found" }, { status: 401 });
  if (!ctx.restaurant.inventoryEnabled) return NextResponse.json({ error: "Inventory module is disabled for this restaurant" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const db = getDb();
  if (body.action === "ingredient") {
    const existing = await db.ingredient.findFirst({ where: { id: body.id, restaurantId: ctx.restaurant.id } });
    if (!existing) return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    await db.ingredient.update({ where: { id: existing.id }, data: { name: String(body.name || existing.name).trim(), category: String(body.category || existing.category).trim(), unit: allowedUnits.has(body.unit) ? body.unit : existing.unit, supplierId: body.supplierId || null, minimumStock: new Prisma.Decimal(Math.max(0, num(body.minimumStock, Number(existing.minimumStock)))), reorderLevel: new Prisma.Decimal(Math.max(0, num(body.reorderLevel, Number(existing.reorderLevel)))), costPerUnit: new Prisma.Decimal(Math.max(0, num(body.costPerUnit, Number(existing.costPerUnit)))), active: body.active !== false } });
    return NextResponse.json({ ok: true });
  }
  if (body.action === "supplier") {
    const existing = await db.supplier.findFirst({ where: { id: body.id, restaurantId: ctx.restaurant.id } });
    if (!existing) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    await db.supplier.update({ where: { id: existing.id }, data: { name: String(body.name || existing.name).trim(), contactName: String(body.contactName || "").trim() || null, email: String(body.email || "").trim() || null, phone: String(body.phone || "").trim() || null, leadTimeDays: Math.max(0, Math.round(num(body.leadTimeDays, existing.leadTimeDays))), notes: String(body.notes || "").trim() || null, active: body.active !== false } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await context(slug);
  if (!ctx) return NextResponse.json({ error: "Unauthorized or restaurant not found" }, { status: 401 });
  if (!ctx.restaurant.inventoryEnabled) return NextResponse.json({ error: "Inventory module is disabled for this restaurant" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const db = getDb();
  if (body.action === "ingredient") await db.ingredient.updateMany({ where: { id: body.id, restaurantId: ctx.restaurant.id }, data: { active: false } });
  else if (body.action === "supplier") await db.supplier.updateMany({ where: { id: body.id, restaurantId: ctx.restaurant.id }, data: { active: false } });
  else return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
