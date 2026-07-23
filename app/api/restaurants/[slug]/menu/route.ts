import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";
import { toMenuItem } from "@/lib/db-mappers";


export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const db = getDb();
  const { slug } = await params;
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    include: {
      menuItems: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          modifierLinks: {
            orderBy: { sortOrder: "asc" },
            include: {
              modifierGroup: {
                include: {
                  options: {
                    where: { available: true },
                    orderBy: { sortOrder: "asc" }
                  }
                }
              }
            }
          }
        }
      }
    }
  });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  return NextResponse.json(restaurant.menuItems.map(toMenuItem));
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const db = getDb();
  const { slug } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const menu = await request.json();
  const restaurant = await db.restaurant.findUnique({ where: { slug }, select: { id: true } });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  await db.$transaction(async (tx: any) => {
    const ids = menu.map((item: any) => Number(item.id));
    await tx.menuItem.deleteMany({ where: { restaurantId: restaurant.id, externalId: { notIn: ids } } });
    for (let index = 0; index < menu.length; index++) {
      const item = menu[index];
      await tx.menuItem.upsert({
        where: { restaurantId_externalId: { restaurantId: restaurant.id, externalId: Number(item.id) } },
        update: { name: item.name, description: item.description, category: item.category, price: item.price, emoji: item.emoji, imageUrl: item.imageUrl ?? null, badge: item.badge ?? null, available: item.available !== false, sortOrder: index },
        create: { restaurantId: restaurant.id, externalId: Number(item.id), name: item.name, description: item.description, category: item.category, price: item.price, emoji: item.emoji, imageUrl: item.imageUrl ?? null, badge: item.badge ?? null, available: item.available !== false, sortOrder: index }
      });
    }
  });
  return NextResponse.json({ ok: true, count: menu.length });
}
