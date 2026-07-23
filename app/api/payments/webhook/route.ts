import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { awardOrderPoints } from "@/lib/loyalty";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
  const signature = (await headers()).get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  try {
    const event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
    const db = getDb();
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId) { await db.order.updateMany({ where: { id: orderId, paymentStatus: { not: "PAID" } }, data: { paymentStatus: "PAID", stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null, paidAt: new Date() } }); await awardOrderPoints(db, orderId); }
    }
    if (event.type === "checkout.session.async_payment_failed") {
      const orderId = event.data.object.metadata?.orderId;
      if (orderId) await db.order.updateMany({ where: { id: orderId }, data: { paymentStatus: "FAILED" } });
    }
    if (event.type === "charge.refunded") {
      const intent = typeof event.data.object.payment_intent === "string" ? event.data.object.payment_intent : null;
      if (intent) await db.order.updateMany({ where: { stripePaymentIntentId: intent }, data: { paymentStatus: "REFUNDED", refundedAt: new Date() } });
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid webhook" }, { status: 400 });
  }
}
