import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { toRestaurantOrder } from "@/lib/db-mappers";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("session_id");
  if (!id) return NextResponse.json({ error: "Missing session" }, { status: 400 });
  try {
    const session = await getStripe().checkout.sessions.retrieve(id);
    const orderId = session.metadata?.orderId;
    if (!orderId) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (session.payment_status === "paid") await getDb().order.updateMany({ where: { id: orderId, paymentStatus: { not: "PAID" } }, data: { paymentStatus: "PAID", stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null, paidAt: new Date() } });
    const order = await getDb().order.findUnique({ where: { id: orderId }, include: { items: { include: { menuItem: true } } } });
    return order ? NextResponse.json(toRestaurantOrder(order)) : NextResponse.json({ error: "Order not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify payment" }, { status: 400 });
  }
}
