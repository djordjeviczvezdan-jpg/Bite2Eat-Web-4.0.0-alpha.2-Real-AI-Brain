"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getActiveTenant } from "@/lib/tenant-context";
import { subscribeToLiveEvents } from "@/lib/live-events";

type RangeKey = "today" | "7d" | "30d" | "90d";
type Analytics = {
  restaurantName: string;
  range: RangeKey;
  generatedAt: string;
  kpis: { revenue: number; revenueChange: number; orders: number; ordersChange: number; averageOrder: number; averageOrderChange: number; averagePrepMinutes: number };
  trend: { label: string; revenue: number; orders: number }[];
  topItems: { name: string; quantity: number; revenue: number }[];
  fulfilment: { delivery: number; collection: number };
  payments: { card: number; cash: number };
  status: { new: number; preparing: number; ready: number; completed: number; cancelled: number };
  customers: { unique: number; repeat: number };
  peakHour: { label: string; orders: number };
};

const ranges: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" }, { key: "7d", label: "7 days" }, { key: "30d", label: "30 days" }, { key: "90d", label: "90 days" }
];
const euro = (n: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(n);
const change = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

export default function AnalyticsDashboard() {
  const slug = getActiveTenant();
  const [range, setRange] = useState<RangeKey>("7d");
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh(selected = range, quiet = false) {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/restaurants/${slug}/analytics?range=${selected}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load analytics");
      setData(body); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load analytics"); }
    finally { if (!quiet) setLoading(false); }
  }

  useEffect(() => { void refresh(range); }, [range]);
  useEffect(() => subscribeToLiveEvents(slug, () => void refresh(range, true)), [slug, range]);

  const maxTrend = useMemo(() => Math.max(1, ...(data?.trend.map(x => x.revenue) ?? [1])), [data]);
  const maxItem = useMemo(() => Math.max(1, ...(data?.topItems.map(x => x.quantity) ?? [1])), [data]);
  const fulfilmentTotal = (data?.fulfilment.delivery ?? 0) + (data?.fulfilment.collection ?? 0);
  const deliveryPct = fulfilmentTotal ? Math.round((data!.fulfilment.delivery / fulfilmentTotal) * 100) : 0;
  const paymentTotal = (data?.payments.card ?? 0) + (data?.payments.cash ?? 0);
  const cardPct = paymentTotal ? Math.round((data!.payments.card / paymentTotal) * 100) : 0;

  return <main className="biPage">
    <header className="biHeader">
      <div><span className="biEyebrow">BITE2EAT ANALYTICS · LIVE DATABASE</span><h1>{data?.restaurantName ?? "Restaurant"} performance</h1><p>Sales, orders, customers and menu performance from PostgreSQL.</p></div>
      <nav><Link href={`/r/${slug}/admin`}>Admin</Link><Link href={`/r/${slug}/profitability`}>Profitability</Link><Link href={`/r/${slug}/customers`}>Customers</Link><Link href={`/r/${slug}/kitchen`}>Kitchen</Link><Link href={`/r/${slug}`}>Storefront</Link></nav>
    </header>

    <div className="biControls">
      <div className="biRange">{ranges.map(item => <button key={item.key} className={range === item.key ? "active" : ""} onClick={() => setRange(item.key)}>{item.label}</button>)}</div>
      <button className="biRefresh" onClick={() => void refresh()} disabled={loading}>{loading ? "Refreshing…" : "↻ Refresh"}</button>
    </div>

    {error && <div className="biError">{error}<button onClick={() => void refresh()}>Retry</button></div>}
    {loading && !data ? <div className="biLoading"><span />Loading restaurant analytics…</div> : data && <>
      <section className="biKpis">
        <article><span>Revenue</span><strong>{euro(data.kpis.revenue)}</strong><small className={data.kpis.revenueChange >= 0 ? "up" : "down"}>{change(data.kpis.revenueChange)} vs previous period</small></article>
        <article><span>Paid orders</span><strong>{data.kpis.orders}</strong><small className={data.kpis.ordersChange >= 0 ? "up" : "down"}>{change(data.kpis.ordersChange)} vs previous period</small></article>
        <article><span>Average order</span><strong>{euro(data.kpis.averageOrder)}</strong><small className={data.kpis.averageOrderChange >= 0 ? "up" : "down"}>{change(data.kpis.averageOrderChange)} vs previous period</small></article>
        <article><span>Average completion</span><strong>{data.kpis.averagePrepMinutes ? `${data.kpis.averagePrepMinutes} min` : "—"}</strong><small>Based on completed orders</small></article>
      </section>

      <section className="biMainGrid">
        <article className="biCard biTrend"><header><div><span>SALES TREND</span><h2>Revenue over time</h2></div><b>{euro(data.kpis.revenue)}</b></header><div className="biBars">{data.trend.map(point => <div key={point.label} title={`${point.label}: ${euro(point.revenue)} · ${point.orders} orders`}><i style={{ height: `${Math.max(point.revenue ? 8 : 2, point.revenue / maxTrend * 100)}%` }} /><small>{point.label}</small></div>)}</div></article>
        <article className="biCard biTop"><header><div><span>MENU PERFORMANCE</span><h2>Top-selling items</h2></div></header>{data.topItems.length ? <div className="biItemList">{data.topItems.map((item, index) => <div key={item.name}><b>{index + 1}</b><span><strong>{item.name}</strong><small>{euro(item.revenue)} revenue</small></span><i><em style={{ width: `${item.quantity / maxItem * 100}%` }} /></i><strong>{item.quantity}</strong></div>)}</div> : <p className="biEmpty">No paid item sales in this period.</p>}</article>
      </section>

      <section className="biSplitGrid">
        <article className="biCard"><header><div><span>ORDER MIX</span><h2>Collection vs delivery</h2></div></header><div className="biDonutRow"><div className="biDonut" style={{ background: `conic-gradient(#ffce43 0 ${deliveryPct}%, #252a25 ${deliveryPct}% 100%)` }}><span>{deliveryPct}%<small>delivery</small></span></div><div className="biLegend"><p><i className="delivery"/><span>Delivery</span><strong>{data.fulfilment.delivery}</strong></p><p><i/><span>Collection</span><strong>{data.fulfilment.collection}</strong></p></div></div></article>
        <article className="biCard"><header><div><span>PAYMENTS</span><h2>Card vs cash</h2></div></header><div className="biDonutRow"><div className="biDonut" style={{ background: `conic-gradient(#6c8cff 0 ${cardPct}%, #252a25 ${cardPct}% 100%)` }}><span>{cardPct}%<small>card</small></span></div><div className="biLegend"><p><i className="card"/><span>Card</span><strong>{data.payments.card}</strong></p><p><i/><span>Cash</span><strong>{data.payments.cash}</strong></p></div></div></article>
        <article className="biCard biQuick"><header><div><span>OPERATIONS</span><h2>At a glance</h2></div></header><div><p><span>Peak ordering hour</span><strong>{data.peakHour.orders ? data.peakHour.label : "—"}</strong></p><p><span>Unique customers</span><strong>{data.customers.unique}</strong></p><p><span>Repeat customers</span><strong>{data.customers.repeat}</strong></p><p><span>Completed orders</span><strong>{data.status.completed}</strong></p></div></article>
      </section>

      <section className="biCard biPipeline"><header><div><span>LIVE ORDER PIPELINE</span><h2>Current status totals</h2></div><small>Includes all orders created in the selected period</small></header><div>{Object.entries(data.status).map(([key, value]) => <article key={key}><span className={key}/><strong>{value}</strong><small>{key.replace("preparing", "cooking")}</small></article>)}</div></section>
      <p className="biUpdated">Last calculated {new Date(data.generatedAt).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
    </>}
  </main>;
}
