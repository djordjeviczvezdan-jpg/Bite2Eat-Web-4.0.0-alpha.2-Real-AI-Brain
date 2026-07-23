import Stripe from "stripe";

let stripe: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to .env.");
  stripe ??= new Stripe(key);
  return stripe;
}

export function getPublicAppUrl(request?: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (request) return new URL(request.url).origin;
  return "http://localhost:3000";
}
