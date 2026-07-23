"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveTenant } from "@/lib/tenant-context";

type Payload = any;
const euro = (value: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value || 0);
const dateTime = (value: string) => new Intl.DateTimeFormat("en-IE", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
const pretty = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, letter => letter.toUpperCase());

export default function CustomerProfile({ customerId }: { customerId: string }) {
  const slug = getActiveTenant();
  const [data, setData] = useState<Payload>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/restaurants/${slug}/customers/${customerId}`, { cache: "no-store" }).then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || "Could not load customer"); return body; }).then(setData).catch(reason => setError(reason.message)); }, [slug, customerId]);
  if (error) return <main className="crmPage"><div className="crmError">{error}</div></main>;
  if (!data) return <main className="crmPage"><div className="crmLoading">Loading customer profile…</div></main>;
  const customer = data.customer;
  return <main className="crmPage">
    <header className="crmProfileHeader">
      <Link href={`/r/${slug}/customers`}>← All customers</Link>
      <div className="crmProfileTitle"><div className="crmAvatar large">{customer.name.trim().slice(0, 2).toUpperCase()}</div><div><span>CUSTOMER PROFILE</span><h1>{customer.name}</h1><p>{customer.email || "No email"} · {customer.phone || "No phone"}</p><div>{customer.segments.map((value: string) => <em className={`segment-${value.toLowerCase()}`} key={value}>{pretty(value)}</em>)}</div></div></div>
    </header>

    <section className="crmStats profile">
      <article><small>Lifetime spend</small><strong>{euro(customer.lifetimeSpend)}</strong><span>Qualifying orders</span></article>
      <article><small>Total orders</small><strong>{customer.orderCount}</strong><span>All recorded orders</span></article>
      <article><small>Average order</small><strong>{euro(customer.averageOrder)}</strong><span>Across qualifying orders</span></article>
      <article><small>Loyalty balance</small><strong>{customer.loyaltyPoints} ★</strong><span>Current points</span></article>
    </section>

    <section className="crmProfileGrid">
      <article className="crmPanel crmDetails"><header><span>CONTACT</span><h2>Customer details</h2></header><dl><div><dt>Email</dt><dd>{customer.email || "Not provided"}</dd></div><div><dt>Phone</dt><dd>{customer.phone || "Not provided"}</dd></div><div><dt>Address</dt><dd>{customer.address || "Not provided"}</dd></div><div><dt>Customer since</dt><dd>{dateTime(customer.createdAt)}</dd></div><div><dt>Last order</dt><dd>{customer.lastOrderAt ? dateTime(customer.lastOrderAt) : "No orders"}</dd></div></dl></article>
      <article className="crmPanel"><header><span>FAVOURITES</span><h2>Most ordered items</h2></header>{customer.favouriteItems.length ? <div className="crmFavourites">{customer.favouriteItems.map((item: any, index: number) => <div key={item.name}><b>{index + 1}</b><span><strong>{item.name}</strong><small>{euro(item.spend)} spend</small></span><em>{item.quantity} ordered</em></div>)}</div> : <p className="crmMuted">No item history yet.</p>}</article>
    </section>

    <section className="crmProfileGrid lower">
      <article className="crmPanel crmOrders"><header><span>ORDER HISTORY</span><h2>Recent orders</h2></header>{data.orders.length ? <div>{data.orders.map((order: any) => <Link href={`/r/${slug}/track/${order.id}`} key={order.id}><div><strong>#{order.orderNumber}</strong><span>{dateTime(order.createdAt)} · {order.items.map((item: any) => `${item.quantity}× ${item.name}`).join(", ")}</span></div><div><em>{pretty(order.status)}</em><strong>{euro(order.total)}</strong></div></Link>)}</div> : <p className="crmMuted">No orders yet.</p>}</article>
      <article className="crmPanel crmLoyalty"><header><span>LOYALTY HISTORY</span><h2>Points activity</h2></header>{data.loyaltyTransactions.length ? <div>{data.loyaltyTransactions.map((transaction: any) => <div key={transaction.id}><i className={transaction.points >= 0 ? "positive" : "negative"}>{transaction.points >= 0 ? "+" : ""}{transaction.points}</i><span><strong>{transaction.description}</strong><small>{dateTime(transaction.createdAt)} · {pretty(transaction.type)}</small></span></div>)}</div> : <p className="crmMuted">No loyalty activity yet.</p>}</article>
    </section>
  </main>;
}
