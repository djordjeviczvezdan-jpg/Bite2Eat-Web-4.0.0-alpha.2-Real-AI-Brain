import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        status: "not-configured",
        message: "DATABASE_URL is not configured.",
        latencyMs: Date.now() - startedAt
      },
      { status: 503 }
    );
  }

  try {
    const db = getDb();
    await db.$queryRaw`SELECT 1`;
    const [restaurants, menuItems, orders] = await Promise.all([
      db.restaurant.count(),
      db.menuItem.count(),
      db.order.count()
    ]);

    return NextResponse.json({
      ok: true,
      status: "connected",
      message: "PostgreSQL is connected.",
      latencyMs: Date.now() - startedAt,
      counts: { restaurants, menuItems, orders }
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "unavailable",
        message: error instanceof Error ? error.message : "Database connection failed.",
        latencyMs: Date.now() - startedAt
      },
      { status: 503 }
    );
  }
}
