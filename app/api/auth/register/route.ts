import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { hashPassword, SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(10).max(128),
  restaurantName: z.string().trim().min(2).max(100)
});
function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "restaurant"; }

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check all fields. Password must be at least 10 characters." }, { status: 400 });
  const db = getDb();
  const email = parsed.data.email.trim().toLowerCase();
  const existing = await db.staff.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (existing) return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  const base = slugify(parsed.data.restaurantName);
  let slug = base;
  for (let i = 2; await db.restaurant.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`;
  const result = await db.$transaction(async (tx: any) => {
    const restaurant = await tx.restaurant.create({ data: { slug, name: parsed.data.restaurantName, tagline: "Order directly with Bite2Eat", accentColor: "#ffce43" } });
    const staff = await tx.staff.create({ data: { restaurantId: restaurant.id, email, passwordHash: hashPassword(parsed.data.password), name: parsed.data.name, role: "OWNER" } });
    return { restaurant, staff };
  });
  const token = signSession({ staffId: result.staff.id, restaurantId: result.restaurant.id, restaurantSlug: result.restaurant.slug, email, name: result.staff.name, role: "OWNER" });
  const response = NextResponse.json({ ok: true, restaurantSlug: result.restaurant.slug }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
