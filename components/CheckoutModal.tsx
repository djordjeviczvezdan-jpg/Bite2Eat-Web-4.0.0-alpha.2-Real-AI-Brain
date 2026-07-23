"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { MenuItem } from "@/data/menu";
import { saveOrder } from "@/lib/order-store";
import { defaultSettings, loadSettings, type RestaurantSettings } from "@/lib/menu-store";
import { getActiveTenant } from "@/lib/tenant-context";
import LiveOrderTracker from "@/components/LiveOrderTracker";
import { FulfilmentType, PaymentMethod, RestaurantOrder } from "@/lib/order-types";

type CartItem = MenuItem & { quantity: number; modifiers?: string[] };

type Props = {
  open: boolean;
  cart: CartItem[];
  onClose: () => void;
  onOrderPlaced: () => void;
};

export default function CheckoutModal({ open, cart, onClose, onOrderPlaced }: Props) {
  const [fulfilment, setFulfilment] = useState<FulfilmentType>("delivery");
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [step, setStep] = useState<"details" | "confirmed">("details");
  const [submittedOrder, setSubmittedOrder] = useState<RestaurantOrder | null>(null);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const slug = typeof window !== "undefined" ? getActiveTenant() : "";
  useEffect(() => {
    if (!open) return;
    loadSettings().then((next) => {
      setSettings(next);
      if (!next.cardEnabled && next.cashEnabled) setPayment("cash");
      if (!next.cashEnabled && next.cardEnabled) setPayment("card");
    });
  }, [open]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const qualifiesForFreeDelivery = fulfilment === "delivery" && settings.freeDeliveryThreshold > 0 && subtotal >= settings.freeDeliveryThreshold;
  const deliveryFee = fulfilment === "delivery" && !qualifiesForFreeDelivery ? settings.deliveryFee : 0;
  const serviceFee = .5;
  const total = subtotal + deliveryFee + serviceFee;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const address = String(data.get("address") || "").trim();
    if (!settings.acceptingOrders) { setError("Online ordering is currently paused."); return; }
    if (cart.length === 0) { setError("Your basket is empty."); return; }
    if (fulfilment === "delivery" && subtotal < settings.minimumOrder) {
      setError(`Delivery requires a minimum food order of €${settings.minimumOrder.toFixed(2)}.`);
      return;
    }
    if (!name || phone.length < 7 || (fulfilment === "delivery" && !address)) {
      setError("Please complete the required customer details.");
      return;
    }
    if ((payment === "card" && (!settings.cardEnabled || subtotal < settings.minimumCardOrder)) || (payment === "cash" && !settings.cashEnabled)) {
      setError(payment === "card" && subtotal < settings.minimumCardOrder ? `Card payments require a minimum order of €${settings.minimumCardOrder.toFixed(2)}.` : "That payment method is not currently available.");
      return;
    }

    const orderNumber = 1042 + Math.floor(Date.now() / 1000) % 8000;
    const order: RestaurantOrder = {
      id: crypto.randomUUID(), orderNumber,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      fulfilment, paymentMethod: payment, status: "new",
      customer: {
        name, phone,
        email: String(data.get("email") || "").trim() || undefined,
        address: fulfilment === "delivery" ? address : undefined,
        postcode: String(data.get("postcode") || "").trim() || undefined,
        notes: String(data.get("notes") || "").trim() || undefined
      },
      items: cart.map(({ id, name, emoji, price, quantity, modifiers }) => ({ id, name, emoji, price, quantity, modifiers })),
      subtotal, deliveryFee, serviceFee, total,
      estimatedMinutes: fulfilment === "delivery" ? parseInt(settings.deliveryMinutes, 10) : parseInt(settings.collectionMinutes, 10)
    };
    try {
      if (payment === "card") {
        const response = await fetch(`/api/restaurants/${slug}/checkout`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(order)
        });
        const result = await response.json();
        if (!response.ok || !result.url) throw new Error(result.error ?? "Could not start secure payment.");
        window.location.href = result.url;
        return;
      }
      const savedOrder = await saveOrder(order);
      setSubmittedOrder(savedOrder);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not place order.");
      return;
    }
    setStep("confirmed");
    onOrderPlaced();
  }

  function close() {
    setStep("details");
    setSubmittedOrder(null);
    setError("");
    onClose();
  }

  if (!open) return null;

  if (step === "confirmed" && submittedOrder) {
    return <div className="checkoutOverlay"><section className="confirmationCard">
      <div className="successTick">✓</div>
      <span className="sectionLabel">Order received</span>
      <h2>Thank you, {submittedOrder.customer.name.split(" ")[0]}.</h2>
      <p>Order <strong>#{submittedOrder.orderNumber}</strong> has been sent live to {settings.restaurantName || "the restaurant"}.</p>
      <div className="etaBox"><small>Estimated {submittedOrder.fulfilment}</small><strong>{submittedOrder.estimatedMinutes} minutes</strong></div>
      <LiveOrderTracker initialOrder={submittedOrder} />
      <a className="checkoutPrimary trackingLinkButton" href={`/r/${slug}/track/${submittedOrder.id}`}>Open full tracking page →</a>
      <a className="kitchenDemoLink" href={`/r/${slug}/kitchen`} target="_blank">Open kitchen demo ↗</a>
      <button className="checkoutSecondary" onClick={close}>Back to menu</button>
    </section></div>;
  }

  return <div className="checkoutOverlay">
    <section className="checkoutShell">
      <button className="checkoutClose" onClick={close}>×</button>
      <div className="checkoutMain">
        <div className="checkoutTitle"><span className="sectionLabel">Secure checkout</span><h2>Complete your order</h2><p>Your order will appear instantly on the kitchen dashboard.</p></div>
        <div className="fulfilmentToggle">
          <button type="button" className={fulfilment === "delivery" ? "active" : ""} onClick={() => setFulfilment("delivery")}><strong>Delivery</strong><small>{settings.deliveryMinutes} min · min €{settings.minimumOrder.toFixed(2)}</small></button>
          <button type="button" className={fulfilment === "collection" ? "active" : ""} onClick={() => setFulfilment("collection")}><strong>Collection</strong><small>Ready in {settings.collectionMinutes} min</small></button>
        </div>
        <form id="checkout-form" className="checkoutForm" onSubmit={submit}>
          <div className="fieldGrid"><label>Full name*<input name="name" placeholder="John Smith" /></label><label>Mobile number*<input name="phone" placeholder="087 123 4567" /></label></div>
          <label>Email receipt<input name="email" type="email" placeholder="john@email.com" /></label>
          {fulfilment === "delivery" && <><label>Delivery address*<input name="address" placeholder="House number and street" /></label><label>Eircode<input name="postcode" placeholder="D15 XXXX" /></label></>}
          <label>Order notes<textarea name="notes" placeholder="Gate code, apartment, or delivery instructions" /></label>
          <div className="paymentChoice"><span>Payment method</span>{settings.cardEnabled && <label><input type="radio" name="payment" checked={payment === "card"} onChange={() => setPayment("card")} /> Card / Apple Pay</label>}{settings.cashEnabled && <label><input type="radio" name="payment" checked={payment === "cash"} onChange={() => setPayment("cash")} /> Cash on {fulfilment}</label>}</div>
          {payment === "card" && <div className="demoCardNotice"><strong>Secure Stripe payment</strong><span>Cards, Apple Pay and Google Pay are shown by Stripe when available on the customer’s device.</span></div>}
          {error && <p className="checkoutError">{error}</p>}
        </form>
      </div>
      <aside className="checkoutSummaryPanel">
        <span className="sectionLabel">Your order</span><h3>{cart.reduce((s, i) => s + i.quantity, 0)} items</h3>
        <div className="checkoutLines">{cart.map(item => <div className="checkoutLine" key={item.id}><span className="lineQty">{item.quantity}×</span><div><strong>{item.name}</strong>{item.modifiers?.map(m => <small key={m}>{m}</small>)}</div><b>€{(item.price * item.quantity).toFixed(2)}</b></div>)}</div>
        <div className="priceBreakdown"><div><span>Subtotal</span><b>€{subtotal.toFixed(2)}</b></div><div><span>{fulfilment === "delivery" ? "Delivery" : "Collection"}</span><b>{deliveryFee ? `€${deliveryFee.toFixed(2)}` : "FREE"}</b></div>{fulfilment === "delivery" && !qualifiesForFreeDelivery && settings.freeDeliveryThreshold > 0 && <small className="freeDeliveryProgress">Add €{Math.max(0, settings.freeDeliveryThreshold - subtotal).toFixed(2)} more for free delivery</small>}<div><span>Service fee</span><b>€{serviceFee.toFixed(2)}</b></div><div className="grandTotal"><span>Total</span><b>€{total.toFixed(2)}</b></div></div>
        <button form="checkout-form" className="checkoutPrimary" type="submit" disabled={!settings.acceptingOrders || cart.length === 0}>{payment === "card" ? "Continue to secure payment" : "Place cash order"} · €{total.toFixed(2)}</button>
        <small className="secureCopy">🔒 Secure ordering powered by Bite2Eat</small>
      </aside>
    </section>
  </div>;
}
