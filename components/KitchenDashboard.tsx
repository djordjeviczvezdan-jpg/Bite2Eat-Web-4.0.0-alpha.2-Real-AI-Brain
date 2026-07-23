"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getOrders, updateOrderStatus } from "@/lib/order-store";
import type { OrderStatus, RestaurantOrder } from "@/lib/order-types";
import { getActiveTenant } from "@/lib/tenant-context";
import { loadSettings, type RestaurantSettings, defaultSettings } from "@/lib/menu-store";
import { playNewOrderSound } from "@/lib/live-events";

type KitchenColumn = "new" | "preparing" | "ready";
type FulfilmentFilter = "all" | "delivery" | "collection";
type PaymentFilter = "all" | "paid" | "cash" | "pending";

const columns: Array<{ id: KitchenColumn; title: string; subtitle: string }> = [
  { id: "new", title: "New", subtitle: "Waiting to be accepted" },
  { id: "preparing", title: "Cooking", subtitle: "Being prepared now" },
  { id: "ready", title: "Ready", subtitle: "Collection or dispatch" }
];

function minutesSince(value: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
}

function timerClass(order: RestaurantOrder) {
  const minutes = minutesSince(order.createdAt);
  if (minutes >= Math.max(20, order.estimatedMinutes)) return "danger";
  if (minutes >= Math.max(10, Math.floor(order.estimatedMinutes * 0.65))) return "warning";
  return "good";
}

function displayColumn(status: OrderStatus): KitchenColumn | null {
  if (status === "new") return "new";
  if (status === "preparing") return "preparing";
  if (status === "ready" || status === "out-for-delivery") return "ready";
  return null;
}

function actionFor(order: RestaurantOrder): { label: string; status: OrderStatus } | null {
  if (order.status === "new") return { label: "Accept & start cooking", status: "preparing" };
  if (order.status === "preparing") return { label: "Mark ready", status: "ready" };
  if (order.status === "ready" && order.fulfilment === "delivery") return { label: "Send with driver", status: "out-for-delivery" };
  if (order.status === "ready") return { label: "Collected", status: "completed" };
  if (order.status === "out-for-delivery") return { label: "Delivered", status: "completed" };
  return null;
}

export default function KitchenDashboard() {
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const [clock, setClock] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [error, setError] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [query, setQuery] = useState("");
  const [fulfilment, setFulfilment] = useState<FulfilmentFilter>("all");
  const [payment, setPayment] = useState<PaymentFilter>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slug = getActiveTenant();

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  }, []);

  const refresh = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const next = await getOrders({ kitchen: true });
      if (initialized.current) {
        const newOrders = next.filter(order => order.status === "new" && !knownIds.current.has(order.id));
        if (newOrders.length) {
          if (soundOn) playNewOrderSound();
          showToast(newOrders.length === 1 ? `New order #${newOrders[0].orderNumber}` : `${newOrders.length} new orders received`);
        }
      }
      knownIds.current = new Set(next.map(order => order.id));
      initialized.current = true;
      setOrders(next);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load kitchen orders.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast, soundOn]);

  useEffect(() => {
    loadSettings().then(setSettings).catch(() => undefined);
    refresh();

    const source = new EventSource(`/api/restaurants/${slug}/orders/stream`);
    const receiveOrders = (event: MessageEvent<string>) => {
      try {
        const next = JSON.parse(event.data) as RestaurantOrder[];
        if (initialized.current) {
          const newOrders = next.filter(order => order.status === "new" && !knownIds.current.has(order.id));
          if (newOrders.length) {
            if (soundOn) playNewOrderSound();
            showToast(newOrders.length === 1 ? `New order #${newOrders[0].orderNumber}` : `${newOrders.length} new orders received`);
          }
        }
        knownIds.current = new Set(next.map(order => order.id));
        initialized.current = true;
        setOrders(next);
        setLoading(false);
        setError("");
        setLiveConnected(true);
      } catch {
        setLiveConnected(false);
      }
    };

    source.addEventListener("orders", receiveOrders as EventListener);
    source.addEventListener("heartbeat", () => setLiveConnected(true));
    source.addEventListener("stream-error", () => setLiveConnected(false));
    source.onopen = () => setLiveConnected(true);
    source.onerror = () => setLiveConnected(false);

    // A slower fallback keeps the kitchen usable if a proxy blocks live streams.
    const fallbackPoll = window.setInterval(() => {
      if (source.readyState !== EventSource.OPEN) refresh();
    }, 8000);
    const tick = window.setInterval(() => setClock(new Date()), 1000);

    return () => {
      source.removeEventListener("orders", receiveOrders as EventListener);
      source.close();
      window.clearInterval(fallbackPoll);
      window.clearInterval(tick);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [refresh, showToast, slug, soundOn]);

  const visibleOrders = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter(order => {
      if (!displayColumn(order.status)) return false;
      if (fulfilment !== "all" && order.fulfilment !== fulfilment) return false;
      if (payment === "paid" && order.paymentStatus !== "paid") return false;
      if (payment === "cash" && order.paymentMethod !== "cash") return false;
      if (payment === "pending" && order.paymentStatus !== "pending") return false;
      return !needle || String(order.orderNumber).includes(needle) || order.customer.name.toLowerCase().includes(needle) || order.customer.phone.toLowerCase().includes(needle);
    });
  }, [orders, query, fulfilment, payment]);

  const activeOrders = orders.filter(order => displayColumn(order.status));
  const completedToday = orders.filter(order => order.status === "completed");
  const overdue = activeOrders.filter(order => timerClass(order) === "danger").length;
  const paidRevenue = orders.filter(order => order.paymentStatus === "paid" || order.paymentMethod === "cash").reduce((sum, order) => sum + order.total, 0);

  async function changeStatus(order: RestaurantOrder, status: OrderStatus) {
    const previous = orders;
    setUpdatingId(order.id);
    setOrders(current => current.map(item => item.id === order.id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
    try {
      const saved = await updateOrderStatus(order.id, status);
      setOrders(current => current.map(item => item.id === saved.id ? saved : item));
    } catch (cause) {
      setOrders(previous);
      showToast(cause instanceof Error ? cause.message : "Could not update the order.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      showToast("Full-screen mode is not available in this browser.");
    }
  }

  return <main className="kdsPage">
    {toast && <div className="kdsToast" role="status"><span>🔔</span><strong>{toast}</strong><button onClick={() => setToast(null)} aria-label="Close notification">×</button></div>}

    <header className="kdsTopbar">
      <div className="kdsIdentity">
        <span className="kdsLogo">{settings.restaurantName?.[0] || "B"}</span>
        <div><strong>{settings.restaurantName || "Bite2Eat"} Kitchen</strong><small className={liveConnected ? "connected" : "reconnecting"}><i /> {liveConnected ? "Live connected" : "Reconnecting…"}</small></div>
      </div>
      <div className="kdsTopActions">
        <time>{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
        <button onClick={() => refresh(true)} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button>
        <button onClick={() => setSoundOn(value => !value)}>{soundOn ? "🔊 Sound on" : "🔇 Sound off"}</button>
        <button onClick={toggleFullscreen}>Full screen</button>
        <Link href={`/r/${slug}/admin`}>Admin</Link>
      </div>
    </header>

    <section className="kdsStats" aria-label="Kitchen summary">
      <article><small>Active orders</small><strong>{activeOrders.length}</strong><span>Across all stages</span></article>
      <article><small>New</small><strong>{activeOrders.filter(order => order.status === "new").length}</strong><span>Waiting for acceptance</span></article>
      <article className={overdue ? "attention" : ""}><small>Overdue</small><strong>{overdue}</strong><span>{overdue ? "Needs attention" : "Kitchen on schedule"}</span></article>
      <article><small>Today&apos;s orders</small><strong>{orders.length}</strong><span>€{paidRevenue.toFixed(2)} processed</span></article>
    </section>

    <section className="kdsToolbar">
      <label className="kdsSearch"><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search order, customer or phone" /></label>
      <div className="kdsFilterGroup" aria-label="Fulfilment filter">
        {(["all", "collection", "delivery"] as FulfilmentFilter[]).map(value => <button key={value} className={fulfilment === value ? "active" : ""} onClick={() => setFulfilment(value)}>{value}</button>)}
      </div>
      <div className="kdsFilterGroup" aria-label="Payment filter">
        {(["all", "paid", "cash", "pending"] as PaymentFilter[]).map(value => <button key={value} className={payment === value ? "active" : ""} onClick={() => setPayment(value)}>{value}</button>)}
      </div>
    </section>

    {error && <div className="kdsError"><strong>Kitchen connection problem</strong><span>{error}</span><button onClick={() => refresh(true)}>Try again</button></div>}

    {loading ? <div className="kdsLoading"><span /><p>Loading live kitchen orders…</p></div> : <section className="kdsBoard">
      {columns.map(column => {
        const list = visibleOrders.filter(order => displayColumn(order.status) === column.id);
        return <div className={`kdsColumn ${column.id}`} key={column.id}>
          <header><div><h2>{column.title}</h2><p>{column.subtitle}</p></div><b>{list.length}</b></header>
          <div className="kdsCardStack">
            {!list.length && <div className="kdsEmpty"><span>✓</span><strong>No {column.title.toLowerCase()} orders</strong><small>New tickets will appear automatically.</small></div>}
            {list.map(order => {
              const action = actionFor(order);
              const age = minutesSince(order.createdAt);
              return <article className={`kdsTicket ${timerClass(order)}`} key={order.id}>
                <div className="kdsTicketHead">
                  <div><span>Order</span><strong>#{order.orderNumber}</strong></div>
                  <time className={timerClass(order)}>{age} min</time>
                </div>
                <div className="kdsCustomer"><strong>{order.customer.name}</strong><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></div>
                <div className="kdsBadges">
                  <span>{order.fulfilment === "delivery" ? "🚗 Delivery" : "🛍 Collection"}</span>
                  <span className={order.paymentStatus === "paid" ? "paid" : ""}>{order.paymentStatus === "paid" ? "✓ Paid" : order.paymentMethod === "cash" ? "Cash" : "Payment pending"}</span>
                  {order.status === "out-for-delivery" && <span className="driver">Driver out</span>}
                </div>
                <div className="kdsItems">
                  {order.items.map((item, index) => <div key={`${item.id}-${index}`}><b>{item.quantity}×</b><p><strong>{item.name}</strong>{item.modifiers?.map(modifier => <small key={modifier}>+ {modifier}</small>)}</p></div>)}
                </div>
                {order.customer.notes && <div className="kdsNote"><b>Kitchen note</b><span>{order.customer.notes}</span></div>}
                {order.customer.address && <div className="kdsAddress"><b>Deliver to</b><span>{order.customer.address}</span></div>}
                <footer><div><small>Total</small><strong>€{order.total.toFixed(2)}</strong></div>{action && <button disabled={updatingId === order.id} onClick={() => changeStatus(order, action.status)}>{updatingId === order.id ? "Updating…" : action.label}<span>→</span></button>}</footer>
              </article>;
            })}
          </div>
        </div>;
      })}
    </section>}

    {!!completedToday.length && <details className="kdsCompleted"><summary>Completed today ({completedToday.length})</summary><div>{completedToday.slice(0, 30).map(order => <span key={order.id}>#{order.orderNumber} · {order.customer.name} · €{order.total.toFixed(2)}</span>)}</div></details>}
  </main>;
}
