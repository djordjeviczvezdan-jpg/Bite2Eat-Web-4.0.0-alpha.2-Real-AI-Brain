import Link from "next/link";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const restaurants = await getDb().restaurant.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: { slug: true, name: true, cuisine: true, city: true, accentColor: true }
  });
  return <main className="saasLanding">
    <header className="saasTopbar"><div className="saasLogo"><span>TA</span><strong>Bite2Eat</strong></div><div className="saasTopActions"><Link href="/system/database">Database status</Link><Link href="/login">Restaurant login</Link></div></header>
    <section className="saasHero"><span>BITE2EAT RESTAURANT OS</span><h1>One platform.<br/><em>Every restaurant.</em></h1><p>AI ordering, checkout, kitchen operations and growth intelligence—powered by live restaurant data.</p><div className="saasHeroActions"><a href="#restaurants">Explore restaurants</a><Link href="/register">Start free trial</Link></div></section>
    <section id="restaurants" className="tenantDirectory"><div className="directoryHeading"><span>LIVE RESTAURANTS</span><h2>Choose a restaurant</h2><p>Every storefront below is loaded directly from PostgreSQL.</p></div>
      <div className="tenantCards">{restaurants.map((r: { slug: string; name: string; cuisine: string | null; city: string | null; accentColor: string }) => <article key={r.slug} style={{"--tenant-accent": r.accentColor} as React.CSSProperties}><div className="tenantCardTop"><span>{r.name[0]}</span><small>LIVE</small></div><h3>{r.name}</h3><p>{r.cuisine || "Restaurant"}</p><small>{r.city || "Online ordering"}</small><div><Link href={`/r/${r.slug}`}>Open storefront</Link><Link href={`/r/${r.slug}/admin`}>Manage</Link></div></article>)}</div>
      {restaurants.length === 0 && <p>No active restaurants yet. <Link href="/register">Create the first one.</Link></p>}
    </section>
    <section className="saasArchitecture"><div><strong>{restaurants.length}</strong><span>Database restaurants</span></div><div><strong>100%</strong><span>Tenant-isolated data</span></div><div><strong>1</strong><span>Shared SaaS codebase</span></div><div><strong>∞</strong><span>Restaurants supported</span></div></section>
  </main>;
}
