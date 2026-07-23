import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "bite2eat_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

export type SessionUser = {
  staffId: string;
  restaurantId: string;
  restaurantSlug: string;
  email: string;
  name: string;
  role: "OWNER" | "MANAGER" | "KITCHEN" | "DRIVER" | "CASHIER";
  exp: number;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
  return value;
}

function b64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string) {
  const [scheme, salt, expectedHex] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function signSession(input: Omit<SessionUser, "exp">) {
  const payload: SessionUser = { ...input, exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS };
  const encoded = b64url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySessionToken(token?: string | null): SessionUser | null {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", secret()).update(encoded).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionUser;
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireRestaurantRole(slug: string, roles: SessionUser["role"][]) {
  const session = await getSession();
  if (!session || session.restaurantSlug !== slug || !roles.includes(session.role)) return null;
  const staff = await getDb().staff.findFirst({
    where: { id: session.staffId, restaurantId: session.restaurantId, isActive: true },
    select: { id: true }
  });
  return staff ? session : null;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_SECONDS
};
