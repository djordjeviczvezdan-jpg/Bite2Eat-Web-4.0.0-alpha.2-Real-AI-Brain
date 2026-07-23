import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";

const CAMPAIGN_STATUSES = new Set(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED"]);
const CAMPAIGN_CHANNELS = new Set(["EMAIL", "SMS", "PUSH"]);

function customerSegments(customer: { createdAt: Date; loyaltyPoints: number; orders: { total: unknown; createdAt: Date }[] }) {
  const orders = customer.orders;
  const lifetimeSpend = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const lastOrderAt = orders[0]?.createdAt ?? null;
  const ageDays = Math.floor((Date.now() - customer.createdAt.getTime()) / 86_400_000);
  const inactiveDays = lastOrderAt ? Math.floor((Date.now() - lastOrderAt.getTime()) / 86_400_000) : ageDays;
  const segments = ["ALL_CUSTOMERS"];
  if (orders.length === 1 && ageDays <= 30) segments.push("NEW_CUSTOMERS");
  if (orders.length >= 3) segments.push("LOYAL_CUSTOMERS");
  if (orders.length >= 6 || customer.loyaltyPoints >= 250) segments.push("VIP_CUSTOMERS");
  if (inactiveDays >= 30) segments.push("INACTIVE_CUSTOMERS");
  if (lifetimeSpend >= 150) segments.push("HIGH_SPENDERS");
  return { segments, lifetimeSpend, lastOrderAt };
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const restaurant = await db.restaurant.findUnique({ where: { slug } });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [coupons, campaigns, customers] = await Promise.all([
    db.coupon.findMany({ where: { restaurantId: restaurant.id }, orderBy: { createdAt: "desc" } }),
    db.marketingCampaign.findMany({ where: { restaurantId: restaurant.id }, orderBy: { createdAt: "desc" } }),
    db.customer.findMany({
      where: { restaurantId: restaurant.id },
      include: { orders: { select: { total: true, createdAt: true }, orderBy: { createdAt: "desc" } } },
      orderBy: { loyaltyPoints: "desc" },
      take: 500,
    }),
  ]);

  const mappedCustomers = customers.map((customer) => {
    const calculated = customerSegments(customer);
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      loyaltyPoints: customer.loyaltyPoints,
      createdAt: customer.createdAt,
      lifetimeSpend: calculated.lifetimeSpend,
      orderCount: customer.orders.length,
      lastOrder: calculated.lastOrderAt,
      segments: calculated.segments,
    };
  });

  const segmentDefinitions = [
    ["ALL_CUSTOMERS", "All customers", "Everyone in your CRM"],
    ["VIP_CUSTOMERS", "VIP customers", "Your most loyal and valuable regulars"],
    ["LOYAL_CUSTOMERS", "Loyal customers", "Customers with three or more orders"],
    ["INACTIVE_CUSTOMERS", "Inactive customers", "No order in the last 30 days"],
    ["NEW_CUSTOMERS", "New customers", "First order within the last 30 days"],
    ["HIGH_SPENDERS", "High spenders", "At least €150 lifetime spend"],
  ] as const;

  const segments = segmentDefinitions.map(([key, name, description]) => {
    const members = mappedCustomers.filter((customer) => customer.segments.includes(key));
    return {
      key,
      name,
      description,
      customerCount: members.length,
      lifetimeValue: members.reduce((sum, customer) => sum + customer.lifetimeSpend, 0),
      averageSpend: members.length ? members.reduce((sum, customer) => sum + customer.lifetimeSpend, 0) / members.length : 0,
    };
  });

  return NextResponse.json({
    settings: {
      loyaltyEnabled: restaurant.loyaltyEnabled,
      loyaltyPointsPerEuro: restaurant.loyaltyPointsPerEuro,
      loyaltyRewardPoints: restaurant.loyaltyRewardPoints,
      loyaltyRewardValue: Number(restaurant.loyaltyRewardValue),
      loyaltySignupBonus: restaurant.loyaltySignupBonus,
    },
    coupons: coupons.map((coupon) => ({ ...coupon, value: Number(coupon.value), minimumSpend: Number(coupon.minimumSpend) })),
    campaigns,
    customers: mappedCustomers,
    segments,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getDb();
  const restaurant = await db.restaurant.findUnique({ where: { slug }, select: { id: true } });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json();

  if (body.kind === "coupon") {
    const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!code) return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    const coupon = await db.coupon.create({
      data: {
        restaurantId: restaurant.id,
        code,
        title: String(body.title || code).trim(),
        description: body.description ? String(body.description).trim() : null,
        type: body.type || "PERCENT",
        value: Number(body.value || 0),
        minimumSpend: Number(body.minimumSpend || 0),
        active: true,
      },
    });
    return NextResponse.json(coupon, { status: 201 });
  }

  const name = String(body.name || "").trim();
  const message = String(body.message || "").trim();
  const audience = String(body.audience || "ALL_CUSTOMERS").trim();
  const channel = String(body.channel || "EMAIL").toUpperCase();
  const status = String(body.status || "DRAFT").toUpperCase();
  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;

  if (!name) return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  if (!message) return NextResponse.json({ error: "Campaign message is required" }, { status: 400 });
  if (!CAMPAIGN_CHANNELS.has(channel)) return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  if (!CAMPAIGN_STATUSES.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return NextResponse.json({ error: "Invalid schedule date" }, { status: 400 });

  const campaign = await db.marketingCampaign.create({
    data: {
      restaurantId: restaurant.id,
      name,
      audience,
      channel,
      message,
      status: status as any,
      scheduledAt,
    },
  });
  return NextResponse.json(campaign, { status: 201 });
}
