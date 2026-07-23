"use client";

import { useEffect, useMemo, useState } from "react";
import { getOrders, seedDemoOrders, subscribeToOrders, updateOrderStatus } from "@/lib/order-store";
import { OrderStatus, RestaurantOrder } from "@/lib/order-types";

const columns: { status: OrderStatus; label: string; accent: string }[] = [
  { status: "new", label: "New orders", accent: "new" },
  { status: "preparing", label: "Preparing", accent: "preparing" },
  { status: "ready", label: "Ready", accent: "ready" },
  { status: "out-for-delivery", label: "Out / collection", accent: "out" },
  { status: "completed", label: "Completed", accent: "completed" }
];

const nextStatus: Record<OrderStatus, OrderStatus | null> = { new: "preparing", preparing: "ready", ready: "out-for-delivery", "out-for-delivery": "completed", completed: null };

function elapsed(date: string) { return Math.max(0, Math.floor((Date.now() - +new Date(date)) / 60000)); }

export default function KitchenPage() {
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [clock, setClock] = useState(new Date());
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    seedDemoOrders();
    const refresh = () => { getOrders().then(setOrders); };
    refresh();
    const unsubscribe = subscribeToOrders(refresh);
    const timer = setInterval(() => setClock(new Date()), 30000);
    return () => { unsubscribe(); clearInterval(timer); };
  }, []);

  const activeOrders = orders.filter(o => o.status !== "completed");
  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const avgOrder = orders.length ? revenue / orders.length : 0;
  const avgPrep = activeOrders.length ? Math.round(activeOrders.reduce((s, o) => s + elapsed(o.createdAt), 0) / activeOrders.length) : 0;

  function advance(order: RestaurantOrder) {
    const status = nextStatus[order.status];
    if (status) updateOrderStatus(order.id, status);
  }

  return <main className="kitchenPage">
    <header className="kitchenHeader">
      <div className="kitchenBrand"><span className="brandMark">B2E</span><div><strong>Kitchen</strong><small>Powered by Bite2Eat · Live</small></div></div>
      <div className="kitchenHeaderActions"><span className="livePulse"><i /> Live</span><span>{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><button onClick={() => setSoundOn(v => !v)}>{soundOn ? "🔊 Sound on" : "🔇 Sound off"}</button><a href="/analytics">Analytics ↗</a><a href="/admin">Admin ↗</a><a href="/">Customer site ↗</a></div>
    </header>

    <section className="kitchenStats">
      <div><small>Active orders</small><strong>{activeOrders.length}</strong><span>Across kitchen</span></div>
      <div><small>Today&apos;s revenue</small><strong>€{revenue.toFixed(2)}</strong><span>Demo session</span></div>
      <div><small>Average order</small><strong>€{avgOrder.toFixed(2)}</strong><span>{orders.length} orders</span></div>
      <div><small>Average wait</small><strong>{avgPrep} min</strong><span>Live timer</span></div>
    </section>

    <section className="kitchenBoard">
      {columns.map(column => {
        const list = orders.filter(o => o.status === column.status);
        return <div className={`kitchenColumn ${column.accent}`} key={column.status}>
          <div className="columnHead"><h2>{column.label}</h2><span>{list.length}</span></div>
          <div className="orderStack">{list.length === 0 ? <div className="emptyColumn">No orders</div> : list.map(order => <article className={`orderTicket ${order.status === "new" ? "urgent" : ""}`} key={order.id}>
            <div className="ticketTop"><div><span>#{order.orderNumber}</span><strong>{order.customer.name}</strong></div><div className="ticketTimer">{elapsed(order.createdAt)} min</div></div>
            <div className="ticketMeta"><span>{order.fulfilment === "delivery" ? "🚗 Delivery" : "🛍 Collection"}</span><span>{order.paymentMethod === "card" ? "Paid" : "Cash"}</span></div>
            <div className="ticketItems">{order.items.map(item => <div key={item.id}><b>{item.quantity}×</b><span>{item.name}{item.modifiers?.map(m => <small key={m}>↳ {m}</small>)}</span></div>)}</div>
            {order.customer.address && <p className="ticketAddress">📍 {order.customer.address}</p>}
            {order.customer.notes && <p className="ticketNote">Note: {order.customer.notes}</p>}
            <div className="ticketBottom"><strong>€{order.total.toFixed(2)}</strong>{nextStatus[order.status] ? <button onClick={() => advance(order)}>{order.status === "new" ? "Accept order" : order.status === "preparing" ? "Mark ready" : order.status === "ready" ? (order.fulfilment === "delivery" ? "Send out" : "Collected") : "Complete"} →</button> : <span>✓ Finished</span>}</div>
          </article>)}</div>
        </div>;
      })}
    </section>
  </main>;
}
