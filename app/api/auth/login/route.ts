import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifyPassword } from "@/lib/auth";

const schema = z.object({ email: z.string().email(), password: z.string().min(8) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const staff = await getDb().staff.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, isActive: true, restaurant: { isActive: true } },
    include: { restaurant: { select: { id: true, slug: true } } }
  });
  if (!staff || !verifyPassword(parsed.data.password, staff.passwordHash)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  const token = signSession({ staffId: staff.id, restaurantId: staff.restaurant.id, restaurantSlug: staff.restaurant.slug, email: staff.email, name: staff.name, role: staff.role });
  const response = NextResponse.json({ ok: true, user: { name: staff.name, role: staff.role, restaurantSlug: staff.restaurant.slug } });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
