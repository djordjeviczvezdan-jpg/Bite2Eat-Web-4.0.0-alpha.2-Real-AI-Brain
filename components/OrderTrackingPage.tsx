"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import LiveOrderTracker from "@/components/LiveOrderTracker";
import type { RestaurantOrder } from "@/lib/order-types";

type Props = { slug: string; orderId: string; restaurantName: string };

export default function OrderTrackingPage({ slug, orderId, restaurantName }: Props) {
  const [order, setOrder] = useState<RestaurantOrder | null>(null);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const lastStatus = useRef<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/restaurants/${slug}/orders/${orderId}`, { cache: "no-store" });
    if (!response.ok) throw new Error("We could not find this order.");
    const next = await response.json() as RestaurantOrder;
    lastStatus.current = next.status;
    setOrder(next);
    setError("");
  }, [slug, orderId]);

  useEffect(() => {
    let active = true;
    load().catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Could not load order."); });

    const source = new EventSource(`/api/restaurants/${slug}/orders/${orderId}/stream`);
    const receiveOrder = (event: MessageEvent<string>) => {
      try {
        const next = JSON.parse(event.data) as RestaurantOrder;
        if (!active) return;
        lastStatus.current = next.status;
        setOrder(next);
        setConnected(true);
        setError("");
      } catch {
        setConnected(false);
      }
    };

    source.addEventListener("order", receiveOrder as EventListener);
    source.addEventListener("heartbeat", () => setConnected(true));
    source.addEventListener("order-missing", () => setError("We could not find this order."));
    source.addEventListener("stream-error", () => setConnected(false));
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    const fallback = window.setInterval(() => {
      if (source.readyState !== EventSource.OPEN) load().catch(() => undefined);
    }, 8000);

    return () => {
      active = false;
      source.removeEventListener("order", receiveOrder as EventListener);
      source.close();
      window.clearInterval(fallback);
    };
  }, [slug, orderId, load]);

  return <main className="trackingPage">
    <section className="trackingShell">
      <Link className="trackingBack" href={`/r/${slug}`}>← Back to {restaurantName}</Link>
      {error ? <div className="trackingError"><h1>Order not found</h1><p>{error}</p></div> : !order ? <div className="trackingLoading"><span />Loading your live order…</div> : <>
        <div className="trackingHero">
          <span className="sectionLabel">Customer order tracking</span>
          <h1>Order #{order.orderNumber}</h1>
          <p>{restaurantName} has your order. Status changes from the kitchen appear here automatically.</p>
        </div>
        <LiveOrderTracker order={order} connected={connected} />
        <div className="trackingDetails">
          <div><small>Order type</small><strong>{order.fulfilment === "delivery" ? "Delivery" : "Collection"}</strong></div>
          <div><small>Payment</small><strong>{order.paymentMethod === "cash" ? "Cash" : order.paymentStatus === "paid" ? "Card · Paid" : order.paymentStatus === "refunded" ? "Card · Refunded" : order.paymentStatus === "failed" ? "Card · Failed" : "Card · Pending"}</strong></div>
          <div><small>Total</small><strong>€{order.total.toFixed(2)}</strong></div>
        </div>
        {order.fulfilment === "delivery" && order.customer.address && <div className="trackingAddress"><small>Delivering to</small><strong>{order.customer.address}</strong></div>}
        <section className="trackingItems">
          <h2>Your order</h2>
          {order.items.map((item, index) => <div className="trackingItem" key={`${item.id}-${index}`}>
            <span>{item.quantity}×</span><div><strong>{item.name}</strong>{item.modifiers?.map(modifier => <small key={modifier}>{modifier}</small>)}</div><b>€{(item.price * item.quantity).toFixed(2)}</b>
          </div>)}
        </section>
        <p className="trackingHelp">Need help? Contact the takeaway and quote order #{order.orderNumber}.</p>
      </>}
    </section>
  </main>;
}
