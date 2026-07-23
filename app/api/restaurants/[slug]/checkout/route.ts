import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildValidatedOrder } from "@/lib/order-pricing";
import { getPublicAppUrl, getStripe } from "@/lib/stripe";
import { findOrCreateCustomer } from "@/lib/loyalty";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const db = getDb();
    const { slug } = await params;
    const body = await request.json();
    const priced = await buildValidatedOrder(db, slug, body);
    if (body.paymentMethod !== "card") return NextResponse.json({ error: "Use the order endpoint for cash payments" }, { status: 400 });

    const last = await db.order.findFirst({ where: { restaurantId: priced.restaurant.id }, orderBy: { orderNumber: "desc" }, select: { orderNumber: true } });
    const orderNumber = Math.max(1000, last?.orderNumber ?? 1000) + 1;
    const customer = await findOrCreateCustomer(db, priced.restaurant.id, { name: body.customer?.name, email: body.customer?.email, phone: body.customer?.phone, address: body.customer?.address });
    const order = await db.order.create({
      data: {
        restaurantId: priced.restaurant.id,
        customerId: customer.id,
        orderNumber,
        fulfilment: priced.fulfilment,
        paymentMethod: "CARD",
        paymentStatus: "PENDING",
        customerName: String(body.customer?.name ?? "").trim(),
        customerPhone: String(body.customer?.phone ?? "").trim(),
        customerEmail: String(body.customer?.email ?? "").trim() || null,
        address: priced.fulfilment === "DELIVERY" ? String(body.customer?.address ?? "").trim() : null,
        notes: String(body.customer?.notes ?? "").trim() || null,
        subtotal: priced.subtotal,
        deliveryFee: priced.deliveryFee,
        serviceFee: priced.serviceFee,
        total: priced.total,
        estimatedMinutes: priced.estimatedMinutes,
        items: { create: priced.items.map(item => ({ menuItemId: item.menuItemId, name: item.name, unitPrice: item.unitPrice, quantity: item.quantity, modifiers: item.modifiers })) }
      }
    });

    const stripe = getStripe();
    const origin = getPublicAppUrl(request);
    const feePercent = Number(priced.restaurant.platformFeePercent);
    const paymentIntentData: Record<string, unknown> = { metadata: { orderId: order.id, restaurantId: priced.restaurant.id, slug } };
    if (priced.restaurant.stripeAccountId && priced.restaurant.stripeChargesEnabled) {
      paymentIntentData.transfer_data = { destination: priced.restaurant.stripeAccountId };
      if (feePercent > 0) paymentIntentData.application_fee_amount = Math.round(priced.total * 100 * feePercent / 100);
    }
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.customer?.email || undefined,
      success_url: `${origin}/r/${slug}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/r/${slug}/payment/cancel?order_id=${order.id}`,
      line_items: [
        ...priced.items.map(item => ({ quantity: item.quantity, price_data: { currency: "eur", unit_amount: Math.round(item.unitPrice * 100), product_data: { name: item.name, description: item.modifiers.join(", ") || undefined } } })),
        ...(priced.deliveryFee > 0 ? [{ quantity: 1, price_data: { currency: "eur", unit_amount: Math.round(priced.deliveryFee * 100), product_data: { name: "Delivery fee" } } }] : []),
        { quantity: 1, price_data: { currency: "eur", unit_amount: Math.round(priced.serviceFee * 100), product_data: { name: "Service fee" } } }
      ],
      metadata: { orderId: order.id, restaurantId: priced.restaurant.id, slug },
      payment_intent_data: paymentIntentData
    });
    await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
    return NextResponse.json({ url: session.url, orderId: order.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start payment" }, { status: 400 });
  }
}
