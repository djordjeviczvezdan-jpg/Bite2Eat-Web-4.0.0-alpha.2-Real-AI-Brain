"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { RestaurantOrder } from "@/lib/order-types";

export default function PaymentSuccessPage() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const [order, setOrder] = useState<RestaurantOrder | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const sessionId = search.get("session_id");
    if (!sessionId) { setError("Payment session is missing."); return; }
    fetch(`/api/payments/session?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Could not verify payment");
        setOrder(body);
        try { localStorage.removeItem(`takeai-cart-v1:${params.slug}`); } catch {}
      })
      .catch(cause => setError(cause instanceof Error ? cause.message : "Could not verify payment"));
  }, [params.slug, search]);

  return <main className="paymentResultPage"><section className="confirmationCard">
    {error ? <><div className="paymentResultIcon">!</div><span className="sectionLabel">Payment check</span><h2>We could not verify the payment yet.</h2><p>{error}</p><a className="checkoutPrimary" href={`/r/${params.slug}`}>Return to restaurant</a></> : !order ? <><div className="paymentSpinner"/><span className="sectionLabel">Secure payment</span><h2>Confirming your order…</h2><p>Please keep this page open for a moment.</p></> : <><div className="successTick">✓</div><span className="sectionLabel">Payment successful</span><h2>Order #{order.orderNumber} is confirmed.</h2><p>Your payment is secure and the order is ready for the kitchen.</p><div className="etaBox"><small>Estimated {order.fulfilment}</small><strong>{order.estimatedMinutes} minutes</strong></div><a className="checkoutPrimary" href={`/r/${params.slug}/track/${order.id}`}>Track your order →</a><a className="checkoutSecondary" href={`/r/${params.slug}`}>Back to menu</a></>}
  </section></main>;
}
