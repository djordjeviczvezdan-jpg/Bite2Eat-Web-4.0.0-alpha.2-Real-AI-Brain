"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getActiveTenant } from "@/lib/tenant-context";

type Segment = "VIP" | "LOYAL" | "NEW" | "INACTIVE" | "HIGH_SPENDER";
type Customer = {
  id: string; name: string; email: string | null; phone: string | null; address: string | null;
  loyaltyPoints: number; createdAt: string; orderCount: number; lifetimeSpend: number;
  averageOrder: number; lastOrderAt: string | null; segments: Segment[];
};
type Payload = {
  restaurantName: string;
  customers: Customer[];
  summary: { total: number; vip: number; inactive: number; loyaltyPoints: number };
};

const euro = (value: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value);
const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-IE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "No orders";
const segmentLabel: Record<Segment, string> = { VIP: "VIP", LOYAL: "Loyal", NEW: "New", INACTIVE: "Inactive", HIGH_SPENDER: "High spender" };

export default function CustomerCRM() {
  const slug = getActiveTenant();
  const [data, setData] = useState<Payload | null>(null);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment | "ALL">("ALL");
  const [sort, setSort] = useState("spend");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ search, segment, sort });
        const response = await fetch(`/api/restaurants/${slug}/customers?${params}`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load customers");
        setData(body); setError("");
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not load customers");
      } finally { setLoading(false); }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [slug, search, segment, sort]);

  const resultLabel = useMemo(() => `${data?.customers.length ?? 0} customer${data?.customers.length === 1 ? "" : "s"}`, [data]);

  return <main className="crmPage">
    <header className="crmHeader">
      <div><span>BITE2EAT CUSTOMER CRM</span><h1>{data?.restaurantName ?? "Restaurant"} customers</h1><p>Understand your regulars, reward loyalty and find customers ready to return.</p></div>
      <nav><Link href={`/r/${slug}/admin`}>Admin</Link><Link href={`/r/${slug}/analytics`}>Analytics</Link><Link href={`/r/${slug}/marketing`}>Marketing</Link></nav>
    </header>

    <section className="crmStats">
      <article><small>Total customers</small><strong>{data?.summary.total ?? "—"}</strong><span>Known customer profiles</span></article>
      <article><small>VIP customers</small><strong>{data?.summary.vip ?? "—"}</strong><span>€500+ spend or 20+ orders</span></article>
      <article><small>Inactive</small><strong>{data?.summary.inactive ?? "—"}</strong><span>No order for 30+ days</span></article>
      <article><small>Points in circulation</small><strong>{data?.summary.loyaltyPoints ?? "—"}</strong><span>Available loyalty points</span></article>
    </section>

    <section className="crmPanel">
      <div className="crmTools">
        <label className="crmSearch"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, email or phone" />{search && <button onClick={() => setSearch("")}>Clear</button>}</label>
        <select value={segment} onChange={event => setSegment(event.target.value as Segment | "ALL")} aria-label="Customer segment">
          <option value="ALL">All segments</option><option value="VIP">VIP</option><option value="LOYAL">Loyal</option><option value="NEW">New</option><option value="INACTIVE">Inactive</option><option value="HIGH_SPENDER">High spenders</option>
        </select>
        <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort customers">
          <option value="spend">Highest spend</option><option value="orders">Most orders</option><option value="recent">Most recent</option><option value="points">Most points</option><option value="name">Name A–Z</option>
        </select>
      </div>
      <div className="crmResultHead"><strong>{resultLabel}</strong><span>Live restaurant data</span></div>

      {error && <div className="crmError">{error}</div>}
      {loading && !data ? <div className="crmLoading">Loading customer profiles…</div> : data && data.customers.length ? <div className="crmCustomerList">
        {data.customers.map(customer => <Link href={`/r/${slug}/customers/${customer.id}`} className="crmCustomerCard" key={customer.id}>
          <div className="crmAvatar">{customer.name.trim().slice(0, 2).toUpperCase()}</div>
          <div className="crmIdentity"><strong>{customer.name}</strong><span>{customer.email || customer.phone || "No contact details"}</span><div>{customer.segments.map(value => <em className={`segment-${value.toLowerCase()}`} key={value}>{segmentLabel[value]}</em>)}{!customer.segments.length && <em>Standard</em>}</div></div>
          <div><small>Orders</small><strong>{customer.orderCount}</strong></div>
          <div><small>Lifetime spend</small><strong>{euro(customer.lifetimeSpend)}</strong></div>
          <div><small>Average order</small><strong>{euro(customer.averageOrder)}</strong></div>
          <div><small>Last order</small><strong>{date(customer.lastOrderAt)}</strong></div>
          <div className="crmPoints"><small>Loyalty</small><strong>{customer.loyaltyPoints} ★</strong></div>
          <b className="crmArrow">›</b>
        </Link>)}
      </div> : !loading && <div className="crmEmpty"><strong>No matching customers</strong><p>Try another search or segment.</p><button onClick={() => { setSearch(""); setSegment("ALL"); }}>Show all customers</button></div>}
    </section>
  </main>;
}
