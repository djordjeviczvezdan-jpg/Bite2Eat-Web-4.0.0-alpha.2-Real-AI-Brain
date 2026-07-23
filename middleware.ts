import { NextRequest, NextResponse } from "next/server";

const encoder = new TextEncoder();

async function verify(token: string | undefined) {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || !process.env.AUTH_SECRET) return null;
  try {
    const key = await crypto.subtle.importKey("raw", encoder.encode(process.env.AUTH_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const sig = Uint8Array.from(atob(signature.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(signature.length / 4) * 4, "=")), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify("HMAC", key, sig, encoder.encode(encoded));
    if (!valid) return null;
    const raw = atob(encoded.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(encoded.length / 4) * 4, "="));
    const bytes = Uint8Array.from(raw, c => c.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch { return null; }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const match = pathname.match(/^\/r\/([^/]+)\/(admin|analytics|kitchen)(?:\/|$)/);
  if (!match) return NextResponse.next();
  const [, slug, area] = match;
  const session = await verify(request.cookies.get("bite2eat_session")?.value);
  const allowed = area === "kitchen" ? ["OWNER", "MANAGER", "KITCHEN"] : ["OWNER", "MANAGER"];
  if (!session || session.restaurantSlug !== slug || !allowed.includes(session.role)) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/r/:path*"] };
