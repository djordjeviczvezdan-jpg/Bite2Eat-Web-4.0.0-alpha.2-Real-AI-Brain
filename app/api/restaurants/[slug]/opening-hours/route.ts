import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRestaurantRole } from "@/lib/auth";

export type OpeningHourPayload = {
  dayOfWeek: number;
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
};

const DEFAULT_HOURS: OpeningHourPayload[] = [
  { dayOfWeek: 0, isClosed: false, opensAt: "16:00", closesAt: "23:00" },
  { dayOfWeek: 1, isClosed: false, opensAt: "16:00", closesAt: "23:00" },
  { dayOfWeek: 2, isClosed: false, opensAt: "16:00", closesAt: "23:00" },
  { dayOfWeek: 3, isClosed: false, opensAt: "16:00", closesAt: "23:00" },
  { dayOfWeek: 4, isClosed: false, opensAt: "16:00", closesAt: "00:00" },
  { dayOfWeek: 5, isClosed: false, opensAt: "16:00", closesAt: "00:00" },
  { dayOfWeek: 6, isClosed: false, opensAt: "16:00", closesAt: "23:00" }
];

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const db = getDb();
  const { slug } = await params;
  const restaurant = await db.restaurant.findUnique({
    where: { slug },
    select: {
      id: true,
      openingHours: { orderBy: { dayOfWeek: "asc" } }
    }
  });

  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  if (!restaurant.openingHours.length) return NextResponse.json(DEFAULT_HOURS);

  return NextResponse.json(
    restaurant.openingHours.map((hour: { dayOfWeek: number; isClosed: boolean; opensAt: string | null; closesAt: string | null }) => ({
      dayOfWeek: hour.dayOfWeek,
      isClosed: hour.isClosed,
      opensAt: hour.opensAt ?? "16:00",
      closesAt: hour.closesAt ?? "23:00"
    }))
  );
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const db = getDb();
  const { slug } = await params;
  const session = await requireRestaurantRole(slug, ["OWNER", "MANAGER"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as OpeningHourPayload[];
  if (!Array.isArray(body) || body.length !== 7) {
    return NextResponse.json({ error: "Seven opening-hour rows are required" }, { status: 400 });
  }

  const restaurant = await db.restaurant.findUnique({ where: { slug }, select: { id: true } });
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  await db.$transaction(
    body.map((hour) =>
      db.openingHour.upsert({
        where: {
          restaurantId_dayOfWeek: {
            restaurantId: restaurant.id,
            dayOfWeek: Number(hour.dayOfWeek)
          }
        },
        update: {
          isClosed: Boolean(hour.isClosed),
          opensAt: hour.isClosed ? null : hour.opensAt,
          closesAt: hour.isClosed ? null : hour.closesAt
        },
        create: {
          restaurantId: restaurant.id,
          dayOfWeek: Number(hour.dayOfWeek),
          isClosed: Boolean(hour.isClosed),
          opensAt: hour.isClosed ? null : hour.opensAt,
          closesAt: hour.isClosed ? null : hour.closesAt
        }
      })
    )
  );

  return NextResponse.json({ ok: true });
}
