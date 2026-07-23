"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type StatusPayload = {
  ok: boolean;
  status: "checking" | "not-configured" | "unavailable" | "connected";
  message: string;
  latencyMs?: number;
  counts?: { restaurants: number; menuItems: number; orders: number };
};

const initialStatus: StatusPayload = {
  ok: false,
  status: "checking",
  message: "Checking PostgreSQL connection…"
};

export default function DatabaseFoundation() {
  const [status, setStatus] = useState<StatusPayload>(initialStatus);

  const check = useCallback(async () => {
    setStatus(initialStatus);
    try {
      const response = await fetch("/api/health/database", { cache: "no-store" });
      const payload = (await response.json()) as StatusPayload;
      setStatus(payload);
    } catch {
      setStatus({
        ok: false,
        status: "unavailable",
        message: "The database health endpoint could not be reached."
      });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  return (
    <main className="databasePage">
      <header className="databaseTopbar">
        <Link href="/" className="saasLogo"><span>TA</span><strong>Bite2Eat</strong></Link>
        <div><span>Sprint 8.1</span><Link href="/">Back to platform</Link></div>
      </header>

      <section className="databaseHero">
        <span>PRODUCTION DATABASE FOUNDATION</span>
        <h1>PostgreSQL is now part of the Bite2Eat architecture.</h1>
        <p>This milestone includes the schema, migration, seed process, Prisma client, Docker database and a live connection health check.</p>
      </section>

      <section className={`databaseStatus ${status.status}`}>
        <div className="statusOrb"><i /></div>
        <div>
          <small>DATABASE STATUS</small>
          <h2>{status.status === "connected" ? "Connected and ready" : status.status === "checking" ? "Checking connection" : "Setup required"}</h2>
          <p>{status.message}</p>
        </div>
        <button onClick={() => void check()}>Check again</button>
      </section>

      {status.counts && (
        <section className="databaseCounts">
          <div><strong>{status.counts.restaurants}</strong><span>Restaurants</span></div>
          <div><strong>{status.counts.menuItems}</strong><span>Menu items</span></div>
          <div><strong>{status.counts.orders}</strong><span>Database orders</span></div>
          <div><strong>{status.latencyMs ?? 0}ms</strong><span>Health latency</span></div>
        </section>
      )}

      <section className="databaseGrid">
        <article><span>01</span><h3>Start PostgreSQL</h3><code>docker compose up -d</code><p>Creates a persistent local Bite2Eat database.</p></article>
        <article><span>02</span><h3>Create environment</h3><code>copy .env.example .env</code><p>Connects Prisma to the PostgreSQL container.</p></article>
        <article><span>03</span><h3>Deploy schema</h3><code>npm run db:deploy</code><p>Applies the checked-in production migration.</p></article>
        <article><span>04</span><h3>Seed restaurants</h3><code>npm run db:seed</code><p>Loads Jimmy&apos;s, Mario&apos;s and Green Bowl menus.</p></article>
      </section>

      <section className="databaseArchitecture">
        <div><small>DATABASE MODELS</small><h2>Restaurant data, designed for real multi-device operation.</h2></div>
        <div className="modelMap">
          {["Restaurant", "Staff", "Customer", "MenuItem", "Order", "OrderItem"].map((model) => <span key={model}>{model}</span>)}
        </div>
        <p>The visible application still uses the proven Milestone 7.2 browser stores while Sprint 8 replaces each data path safely. Sprint 8.2 will add secure authentication; Sprint 8.3 will connect live menus, orders and analytics to these database models.</p>
      </section>
    </main>
  );
}
