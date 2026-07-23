import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";
import { toDbStatus, toRestaurantOrder } from "@/lib/db-mappers";
import { awardOrderPoints } from "@/lib/loyalty";
import { deductInventoryForCompletedOrder } from "@/lib/inventory-deduction";

const include = { items: { include: { menuItem: true } } } as const;

export async function GET(_: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const db = getDb();
  const order = await db.order.findFirst({
    where: { id, restaurant: { slug, isActive: true } },
    include
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(toRestaurantOrder(order));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER", "KITCHEN"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const body = await request.json();
  const existing = await db.order.findFirst({ where: { id, restaurant: { slug } }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const order = await db.order.update({
    where: { id },
    data: { status: toDbStatus(body.status) },
    include
  });
  if (order.status === "COMPLETED") {
    if (order.paymentMethod === "CASH") await awardOrderPoints(db, order.id);
    await deductInventoryForCompletedOrder(db, order.id, session.name);
  }
  return NextResponse.json(toRestaurantOrder(order));
}
