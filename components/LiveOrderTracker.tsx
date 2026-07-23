"use client";

import { useMemo } from "react";
import type { OrderStatus, RestaurantOrder } from "@/lib/order-types";

const statusCopy: Record<OrderStatus, { title: string; message: string }> = {
  new: { title: "Order received", message: "The takeaway has received your order." },
  preparing: { title: "Being prepared", message: "The kitchen is preparing your food now." },
  ready: { title: "Ready", message: "Your order is ready for the next step." },
  "out-for-delivery": { title: "On the way", message: "Your order has left the takeaway." },
  completed: { title: "Completed", message: "Your order has been completed. Enjoy!" }
};

export default function LiveOrderTracker({ order: suppliedOrder, initialOrder, connected = false }: { order?: RestaurantOrder; initialOrder?: RestaurantOrder; connected?: boolean }) {
  const order = suppliedOrder ?? initialOrder;
  if (!order) return null;
  const elapsed = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000));

  const steps = useMemo(() => order.fulfilment === "delivery"
    ? [
        { status: "new" as const, label: "Received", icon: "1" },
        { status: "preparing" as const, label: "Preparing", icon: "2" },
        { status: "ready" as const, label: "Ready", icon: "3" },
        { status: "out-for-delivery" as const, label: "On the way", icon: "4" },
        { status: "completed" as const, label: "Delivered", icon: "5" }
      ]
    : [
        { status: "new" as const, label: "Received", icon: "1" },
        { status: "preparing" as const, label: "Preparing", icon: "2" },
        { status: "ready" as const, label: "Ready", icon: "3" },
        { status: "completed" as const, label: "Collected", icon: "4" }
      ], [order.fulfilment]);

  const normalizedStatus: OrderStatus = order.fulfilment === "collection" && order.status === "out-for-delivery" ? "completed" : order.status;
  const currentIndex = Math.max(0, steps.findIndex(step => step.status === normalizedStatus));
  const copy = statusCopy[normalizedStatus];
  const eta = normalizedStatus === "completed"
    ? (order.fulfilment === "delivery" ? "Delivered" : "Collected")
    : normalizedStatus === "ready"
      ? (order.fulfilment === "delivery" ? "Waiting for dispatch" : "Ready for collection")
      : `Approx. ${Math.max(1, order.estimatedMinutes - elapsed)} min remaining`;

  return <div className="liveTracker">
    <div className={`trackerLive ${connected ? "connected" : "reconnecting"}`}><i /> {connected ? "LIVE UPDATES CONNECTED" : "RECONNECTING…"}</div>
    <div className="trackerStatus"><div><span>{copy.title}</span><small>{copy.message}</small></div><strong>{eta}</strong></div>
    <div className="trackerRail">
      {steps.map((step, index) => <div className={index <= currentIndex ? "active" : ""} key={step.status}>
        <i>{index < currentIndex ? "✓" : step.icon}</i>
        <span>{step.label}</span>
      </div>)}
    </div>
    <p>Keep this page open. It updates automatically when the kitchen changes your order.</p>
  </div>;
}
