import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";


export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const db = getDb();
  const { slug } = await params;
  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  return NextResponse.json({
    slug: restaurant.slug,
    restaurantName: restaurant.name,
    tagline: restaurant.tagline ?? "",
    phone: restaurant.phone ?? "",
    address: restaurant.address ?? "",
    deliveryFee: Number(restaurant.deliveryFee),
    freeDeliveryThreshold: Number(restaurant.freeDeliveryThreshold ?? 0),
    minimumOrder: Number(restaurant.minimumOrder),
    deliveryMinutes: restaurant.deliveryMinutes ?? "35–45",
    collectionMinutes: restaurant.collectionMinutes ?? "15–20",
    acceptingOrders: restaurant.acceptingOrders,
    cashEnabled: restaurant.cashEnabled,
    cardEnabled: restaurant.cardEnabled,
    minimumCardOrder: Number(restaurant.minimumCardOrder),
    stripeChargesEnabled: restaurant.stripeChargesEnabled,
    requireCardPaymentBeforeKitchen: restaurant.requireCardPaymentBeforeKitchen,
    loyaltyEnabled: restaurant.loyaltyEnabled,
    loyaltyPointsPerEuro: restaurant.loyaltyPointsPerEuro,
    loyaltyRewardPoints: restaurant.loyaltyRewardPoints,
    loyaltyRewardValue: Number(restaurant.loyaltyRewardValue),
    loyaltySignupBonus: restaurant.loyaltySignupBonus,
    inventoryEnabled: restaurant.inventoryEnabled,
    recipeCostingEnabled: restaurant.recipeCostingEnabled
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const db = getDb();
  const { slug } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const updated = await db.restaurant.update({
    where: { slug },
    data: {
      name: body.restaurantName,
      tagline: body.tagline,
      phone: body.phone,
      address: body.address,
      deliveryFee: body.deliveryFee,
      freeDeliveryThreshold: body.freeDeliveryThreshold || null,
      minimumOrder: body.minimumOrder,
      deliveryMinutes: body.deliveryMinutes,
      collectionMinutes: body.collectionMinutes,
      acceptingOrders: body.acceptingOrders,
      cashEnabled: body.cashEnabled,
      cardEnabled: body.cardEnabled,
      minimumCardOrder: body.minimumCardOrder ?? 0,
      requireCardPaymentBeforeKitchen: body.requireCardPaymentBeforeKitchen !== false,
      loyaltyEnabled: body.loyaltyEnabled !== false,
      loyaltyPointsPerEuro: Math.max(0, Number(body.loyaltyPointsPerEuro ?? 1)),
      loyaltyRewardPoints: Math.max(1, Number(body.loyaltyRewardPoints ?? 100)),
      loyaltyRewardValue: Math.max(0, Number(body.loyaltyRewardValue ?? 5)),
      loyaltySignupBonus: Math.max(0, Number(body.loyaltySignupBonus ?? 0)),
      inventoryEnabled: body.inventoryEnabled === true,
      recipeCostingEnabled: body.inventoryEnabled === true && body.recipeCostingEnabled === true
    }
  });
  return NextResponse.json({ ok: true, slug: updated.slug });
}
