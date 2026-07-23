"use client";
import Link from "next/link";
import { tenants } from "@/lib/tenants";
export default function TenantDirectory(){return <main className="saasLanding">
<header className="saasTopbar"><div className="saasLogo"><span>TA</span><strong>Bite2Eat</strong></div><div className="saasTopActions"><Link href="/system/database">Database status</Link><Link href="/login">Restaurant login</Link></div></header>
<section className="saasHero"><span>BITE2EAT RESTAURANT OS</span><h1>One platform.<br/><em>Every restaurant.</em></h1><p>AI ordering, checkout, kitchen operations and growth intelligence—now built as a multi-restaurant platform.</p><div className="saasHeroActions"><a href="#restaurants">Explore live restaurants</a><Link href="/login">Open owner portal</Link></div></section>
<section id="restaurants" className="tenantDirectory"><div className="directoryHeading"><span>LIVE TENANTS</span><h2>Choose a restaurant</h2><p>Each storefront has isolated branding, menu, basket, orders and management data.</p></div>
<div className="tenantCards">{tenants.map(t=><article key={t.slug} style={{"--tenant-accent":t.accent} as React.CSSProperties}><div className="tenantCardTop"><span>{t.name[0]}</span><small>LIVE DEMO</small></div><h3>{t.name}</h3><p>{t.cuisine}</p><small>{t.city}</small><div><Link href={`/r/${t.slug}`}>Open storefront</Link><Link href={`/r/${t.slug}/admin`}>Manage</Link></div></article>)}</div></section>
<section className="saasArchitecture"><div><strong>3</strong><span>Independent tenants</span></div><div><strong>100%</strong><span>Isolated restaurant data</span></div><div><strong>1</strong><span>Shared SaaS codebase</span></div><div><strong>∞</strong><span>Restaurants supported</span></div></section>
</main>}
