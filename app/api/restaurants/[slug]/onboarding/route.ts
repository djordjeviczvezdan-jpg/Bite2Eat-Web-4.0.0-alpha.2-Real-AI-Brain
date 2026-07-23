// @ts-nocheck
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";

const bodySchema = z.object({
  step: z.number().int().min(1).max(5),
  complete: z.boolean().optional(),
  business: z.object({
    name: z.string().trim().min(2).max(100),
    cuisine: z.string().trim().max(80).optional().nullable(),
    phone: z.string().trim().max(40).optional().nullable(),
    address: z.string().trim().max(180).optional().nullable(),
    postcode: z.string().trim().max(20).optional().nullable(),
    website: z.string().trim().max(200).optional().nullable(),
    tagline: z.string().trim().max(160).optional().nullable()
  }).optional(),
  brand: z.object({ accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).optional(),
  fulfilment: z.object({
    deliveryFee: z.number().min(0).max(100),
    minimumOrder: z.number().min(0).max(1000),
    freeDeliveryThreshold: z.number().min(0).max(1000).nullable(),
    deliveryRadiusKm: z.number().min(0).max(100).nullable(),
    deliveryMinutes: z.string().trim().max(40).nullable(),
    collectionMinutes: z.string().trim().max(40).nullable(),
    cashEnabled: z.boolean(),
    cardEnabled: z.boolean()
  }).optional(),
  hours: z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), isClosed: z.boolean(), opensAt: z.string().nullable(), closesAt: z.string().nullable() })).length(7).optional()
});

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the onboarding details." }, { status: 400 });
  const input = parsed.data;
  const db = getDb();
  const update: Prisma.RestaurantUpdateInput = {
    onboardingStep: input.complete ? 5 : Math.min(5, input.step + 1),
    onboardingCompleted: Boolean(input.complete)
  };
  if (input.business) Object.assign(update, {
    name: input.business.name,
    cuisine: input.business.cuisine || null,
    phone: input.business.phone || null,
    address: input.business.address || null,
    postcode: input.business.postcode || null,
    website: input.business.website || null,
    tagline: input.business.tagline || null
  });
  if (input.brand) update.accentColor = input.brand.accentColor;
  if (input.fulfilment) Object.assign(update, {
    deliveryFee: new Prisma.Decimal(input.fulfilment.deliveryFee),
    minimumOrder: new Prisma.Decimal(input.fulfilment.minimumOrder),
    freeDeliveryThreshold: input.fulfilment.freeDeliveryThreshold == null ? null : new Prisma.Decimal(input.fulfilment.freeDeliveryThreshold),
    deliveryRadiusKm: input.fulfilment.deliveryRadiusKm == null ? null : new Prisma.Decimal(input.fulfilment.deliveryRadiusKm),
    deliveryMinutes: input.fulfilment.deliveryMinutes || null,
    collectionMinutes: input.fulfilment.collectionMinutes || null,
    cashEnabled: input.fulfilment.cashEnabled,
    cardEnabled: input.fulfilment.cardEnabled
  });
  await db.$transaction(async (tx) => {
    await tx.restaurant.update({ where: { id: session.restaurantId }, data: update });
    if (input.hours) {
      for (const hour of input.hours) {
        await tx.openingHour.upsert({
          where: { restaurantId_dayOfWeek: { restaurantId: session.restaurantId, dayOfWeek: hour.dayOfWeek } },
          update: { isClosed: hour.isClosed, opensAt: hour.isClosed ? null : hour.opensAt, closesAt: hour.isClosed ? null : hour.closesAt },
          create: { restaurantId: session.restaurantId, dayOfWeek: hour.dayOfWeek, isClosed: hour.isClosed, opensAt: hour.isClosed ? null : hour.opensAt, closesAt: hour.isClosed ? null : hour.closesAt }
        });
      }
    }
  });
  return NextResponse.json({ ok: true, completed: Boolean(input.complete) });
}
