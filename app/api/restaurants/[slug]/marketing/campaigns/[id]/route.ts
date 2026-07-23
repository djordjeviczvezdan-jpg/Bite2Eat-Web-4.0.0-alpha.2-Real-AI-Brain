import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";

const allowedStatuses = new Set(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "COMPLETED"]);
const allowedChannels = new Set(["EMAIL", "SMS", "PUSH"]);

async function context(slug: string, id: string) {
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const db = getDb();
  const restaurant = await db.restaurant.findUnique({ where: { slug }, select: { id: true } });
  if (!restaurant) return { error: NextResponse.json({ error: "Restaurant not found" }, { status: 404 }) };
  const campaign = await db.marketingCampaign.findFirst({ where: { id, restaurantId: restaurant.id } });
  if (!campaign) return { error: NextResponse.json({ error: "Campaign not found" }, { status: 404 }) };
  return { db, restaurant, campaign };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const resolved = await context(slug, id);
  if ("error" in resolved) return resolved.error;
  const body = await request.json();

  const name = body.name === undefined ? undefined : String(body.name).trim();
  const message = body.message === undefined ? undefined : String(body.message).trim();
  const status = body.status === undefined ? undefined : String(body.status).toUpperCase();
  const channel = body.channel === undefined ? undefined : String(body.channel).toUpperCase();
  const audience = body.audience === undefined ? undefined : String(body.audience).trim();
  const scheduledAt = body.scheduledAt === undefined
    ? undefined
    : body.scheduledAt
      ? new Date(body.scheduledAt)
      : null;

  if (name !== undefined && !name) return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  if (message !== undefined && !message) return NextResponse.json({ error: "Campaign message is required" }, { status: 400 });
  if (status !== undefined && !allowedStatuses.has(status)) return NextResponse.json({ error: "Invalid campaign status" }, { status: 400 });
  if (channel !== undefined && !allowedChannels.has(channel)) return NextResponse.json({ error: "Invalid campaign channel" }, { status: 400 });
  if (scheduledAt instanceof Date && Number.isNaN(scheduledAt.getTime())) return NextResponse.json({ error: "Invalid schedule date" }, { status: 400 });

  const campaign = await resolved.db.marketingCampaign.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(message !== undefined ? { message } : {}),
      ...(status !== undefined ? { status: status as any } : {}),
      ...(channel !== undefined ? { channel } : {}),
      ...(audience !== undefined ? { audience } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt } : {}),
    },
  });
  return NextResponse.json(campaign);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const resolved = await context(slug, id);
  if ("error" in resolved) return resolved.error;
  await resolved.db.marketingCampaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
