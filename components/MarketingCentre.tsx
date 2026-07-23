"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getActiveTenant } from "@/lib/tenant-context";

const euro = (value: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(value || 0);
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat("en-IE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not scheduled";

const templates = [
  { icon: "🍔", name: "Burger Tuesday", audience: "LOYAL_CUSTOMERS", channel: "EMAIL", message: "Burger Tuesday is back! Enjoy a special deal on your favourite burger today." },
  { icon: "🍕", name: "Family Night", audience: "ALL_CUSTOMERS", channel: "EMAIL", message: "Make tonight family night. Order your favourites and enjoy an easy dinner together." },
  { icon: "🍟", name: "Free Fries Friday", audience: "LOYAL_CUSTOMERS", channel: "SMS", message: "Free Fries Friday: get free fries with any main meal today. Use code FRIDAYFRIES." },
  { icon: "🎂", name: "Birthday Reward", audience: "VIP_CUSTOMERS", channel: "EMAIL", message: "Happy birthday from us! Enjoy a special birthday treat on your next order." },
  { icon: "❤️", name: "We Miss You", audience: "INACTIVE_CUSTOMERS", channel: "EMAIL", message: "We miss you! Come back this week and enjoy a special welcome-back offer." },
  { icon: "⭐", name: "VIP Exclusive", audience: "VIP_CUSTOMERS", channel: "SMS", message: "A VIP-only offer, just for you. Order today and enjoy an exclusive reward." },
];

type CampaignDraft = { id?: string; name: string; audience: string; channel: string; message: string; status: string; scheduledAt: string };
const emptyDraft: CampaignDraft = { name: "", audience: "ALL_CUSTOMERS", channel: "EMAIL", message: "", status: "DRAFT", scheduledAt: "" };

export default function MarketingCentre() {
  const slug = typeof window !== "undefined" ? getActiveTenant() : "";
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"campaigns" | "segments" | "coupons" | "loyalty">("campaigns");
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const load = async () => {
    const response = await fetch(`/api/restaurants/${slug}/marketing`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load Marketing Centre");
    setData(payload);
  };

  useEffect(() => {
    if (!slug) return;
    load().catch((reason) => setError(reason.message));
  }, [slug]);

  const filteredCampaigns = useMemo(() => {
    if (!data) return [];
    return statusFilter === "ALL" ? data.campaigns : data.campaigns.filter((campaign: any) => campaign.status === statusFilter);
  }, [data, statusFilter]);

  const submit = async (path: string, init: RequestInit) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init.headers || {}) } });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The request could not be completed");
      await load();
      return payload;
    } catch (reason: any) {
      setError(reason.message || "Something went wrong");
      throw reason;
    } finally {
      setBusy(false);
    }
  };

  async function saveCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = { ...draft, scheduledAt: draft.scheduledAt || null };
    if (draft.id) {
      await submit(`/api/restaurants/${slug}/marketing/campaigns/${draft.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    } else {
      await submit(`/api/restaurants/${slug}/marketing`, { method: "POST", body: JSON.stringify({ kind: "campaign", ...payload }) });
    }
    setDraft(emptyDraft);
  }

  async function updateStatus(id: string, status: string) {
    await submit(`/api/restaurants/${slug}/marketing/campaigns/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  }

  async function removeCampaign(id: string) {
    if (!window.confirm("Delete this campaign? This cannot be undone.")) return;
    await submit(`/api/restaurants/${slug}/marketing/campaigns/${id}`, { method: "DELETE" });
    if (draft.id === id) setDraft(emptyDraft);
  }

  async function saveLoyalty(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(`/api/restaurants/${slug}`, { cache: "no-store" });
      const current = await response.json();
      const update = await fetch(`/api/restaurants/${slug}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...current, loyaltyEnabled: form.get("enabled") === "on", loyaltyPointsPerEuro: Number(form.get("pointsPerEuro")), loyaltyRewardPoints: Number(form.get("rewardPoints")), loyaltyRewardValue: Number(form.get("rewardValue")), loyaltySignupBonus: Number(form.get("signupBonus")) }),
      });
      const payload = await update.json();
      if (!update.ok) throw new Error(payload.error || "Unable to save loyalty settings");
      await load();
    } catch (reason: any) { setError(reason.message); } finally { setBusy(false); }
  }

  async function createCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await submit(`/api/restaurants/${slug}/marketing`, { method: "POST", body: JSON.stringify({ kind: "coupon", code: form.get("code"), title: form.get("title"), type: form.get("type"), value: form.get("value"), minimumSpend: form.get("minimumSpend") }) });
    event.currentTarget.reset();
  }

  function useTemplate(template: typeof templates[number]) {
    setDraft({ ...emptyDraft, name: template.name, audience: template.audience, channel: template.channel, message: template.message });
    setTab("campaigns");
    window.scrollTo({ top: 320, behavior: "smooth" });
  }

  function editCampaign(campaign: any) {
    setDraft({ id: campaign.id, name: campaign.name, audience: campaign.audience, channel: campaign.channel, message: campaign.message, status: campaign.status, scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : "" });
    window.scrollTo({ top: 320, behavior: "smooth" });
  }

  if (!data) return <main className="marketingPage"><p>{error || "Loading Marketing Centre…"}</p></main>;

  const totalPoints = data.customers.reduce((sum: number, customer: any) => sum + customer.loyaltyPoints, 0);
  const scheduledCount = data.campaigns.filter((campaign: any) => campaign.status === "SCHEDULED").length;

  return <main className="marketingPage">
    <header className="marketingHeader"><div><span>BITE2EAT GROWTH</span><h1>Smart Marketing Centre</h1><p>Create targeted campaigns, understand customer segments and grow repeat orders.</p></div><nav><Link href={`/r/${slug}/admin`}>Admin</Link><Link href={`/r/${slug}/customers`}>Customers</Link><Link href={`/r/${slug}/analytics`}>Analytics</Link></nav></header>

    {error && <div className="marketingError">{error}</div>}

    <section className="growthStats"><article><small>CRM customers</small><strong>{data.customers.length}</strong></article><article><small>Campaigns</small><strong>{data.campaigns.length}</strong><span>{scheduledCount} scheduled</span></article><article><small>Active coupons</small><strong>{data.coupons.filter((coupon: any) => coupon.active).length}</strong></article><article><small>Points in circulation</small><strong>{totalPoints}</strong></article></section>

    <nav className="marketingTabs">
      <button className={tab === "campaigns" ? "active" : ""} onClick={() => setTab("campaigns")}>Campaigns</button>
      <button className={tab === "segments" ? "active" : ""} onClick={() => setTab("segments")}>Customer segments</button>
      <button className={tab === "coupons" ? "active" : ""} onClick={() => setTab("coupons")}>Coupons</button>
      <button className={tab === "loyalty" ? "active" : ""} onClick={() => setTab("loyalty")}>Loyalty</button>
    </nav>

    {tab === "campaigns" && <>
      <section className="campaignWorkspace">
        <article className="growthCard campaignEditor"><div className="growthSectionHead"><div><span className="growthLabel">CAMPAIGN BUILDER</span><h2>{draft.id ? "Edit campaign" : "Create campaign"}</h2></div>{draft.id && <button className="textButton" onClick={() => setDraft(emptyDraft)}>Cancel edit</button>}</div>
          <form onSubmit={saveCampaign} className="growthForm">
            <label>Campaign name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Friday Burger Night" required /></label>
            <div><label>Audience<select value={draft.audience} onChange={(event) => setDraft({ ...draft, audience: event.target.value })}>{data.segments.map((segment: any) => <option key={segment.key} value={segment.key}>{segment.name} ({segment.customerCount})</option>)}</select></label><label>Channel<select value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value })}><option value="EMAIL">Email</option><option value="SMS">SMS</option><option value="PUSH">Push notification</option></select></label></div>
            <label>Message<textarea value={draft.message} onChange={(event) => setDraft({ ...draft, message: event.target.value })} placeholder="Your offer is ready…" required /><small>{draft.message.length} characters</small></label>
            <div><label>Status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="DRAFT">Draft</option><option value="SCHEDULED">Scheduled</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="COMPLETED">Completed</option></select></label><label>Schedule date and time<input type="datetime-local" value={draft.scheduledAt} onChange={(event) => setDraft({ ...draft, scheduledAt: event.target.value })} /></label></div>
            <button disabled={busy}>{busy ? "Saving…" : draft.id ? "Save changes" : "Create campaign"}</button>
          </form>
        </article>

        <article className="growthCard templatePanel"><span className="growthLabel">QUICK TEMPLATES</span><h2>Start with a proven idea</h2><div className="templateGrid">{templates.map((template) => <button key={template.name} onClick={() => useTemplate(template)}><span>{template.icon}</span><b>{template.name}</b><small>{template.audience.replaceAll("_", " ").toLowerCase()}</small></button>)}</div></article>
      </section>

      <section className="growthCard campaignListPanel"><div className="growthSectionHead"><div><span className="growthLabel">CAMPAIGN LIBRARY</span><h2>All campaigns</h2></div><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="SCHEDULED">Scheduled</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="COMPLETED">Completed</option></select></div>
        <div className="campaignTable"><div className="campaignTableRow campaignTableHead"><span>Campaign</span><span>Audience</span><span>Channel</span><span>Status</span><span>Schedule</span><span>Actions</span></div>{filteredCampaigns.length ? filteredCampaigns.map((campaign: any) => <div className="campaignTableRow" key={campaign.id}><span><b>{campaign.name}</b><small>{campaign.message}</small></span><span>{campaign.audience.replaceAll("_", " ")}</span><span>{campaign.channel}</span><span><i className={`campaignStatus status-${campaign.status.toLowerCase()}`}>{campaign.status}</i></span><span>{dateTime(campaign.scheduledAt)}</span><span className="campaignActions"><button onClick={() => editCampaign(campaign)}>Edit</button>{campaign.status === "ACTIVE" ? <button onClick={() => updateStatus(campaign.id, "PAUSED")}>Pause</button> : <button onClick={() => updateStatus(campaign.id, "ACTIVE")}>Activate</button>}<button className="danger" onClick={() => removeCampaign(campaign.id)}>Delete</button></span></div>) : <div className="marketingEmpty">No campaigns match this filter.</div>}</div>
      </section>
    </>}

    {tab === "segments" && <section className="segmentGrid">{data.segments.map((segment: any) => <article className="growthCard" key={segment.key}><span className="growthLabel">{segment.key.replaceAll("_", " ")}</span><h2>{segment.name}</h2><p>{segment.description}</p><div className="segmentMetrics"><div><small>Customers</small><strong>{segment.customerCount}</strong></div><div><small>Lifetime value</small><strong>{euro(segment.lifetimeValue)}</strong></div><div><small>Average spend</small><strong>{euro(segment.averageSpend)}</strong></div></div><button onClick={() => { setDraft({ ...emptyDraft, audience: segment.key, name: `${segment.name} offer` }); setTab("campaigns"); }}>Create campaign</button></article>)}</section>}

    {tab === "coupons" && <section className="growthGrid"><article className="growthCard"><span className="growthLabel">CREATE COUPON</span><h2>Build an offer code</h2><form onSubmit={createCoupon} className="growthForm"><input name="code" placeholder="FRIDAY20" required /><input name="title" placeholder="Friday special" required /><div><select name="type"><option value="PERCENT">Percentage off</option><option value="FIXED">Fixed amount</option><option value="FREE_DELIVERY">Free delivery</option></select><input name="value" type="number" min="0" step="0.01" placeholder="20" /></div><input name="minimumSpend" type="number" min="0" step="0.01" placeholder="Minimum spend" /><button disabled={busy}>Create coupon</button></form></article><article className="growthCard"><span className="growthLabel">COUPON LIBRARY</span><h2>Available offers</h2>{data.coupons.length ? data.coupons.map((coupon: any) => <div className="couponTile" key={coupon.id}><b>{coupon.code}</b><span>{coupon.title}</span><small>{coupon.type === "PERCENT" ? `${Number(coupon.value)}% off` : coupon.type === "FIXED" ? `${euro(coupon.value)} off` : "Free delivery"} · Min {euro(coupon.minimumSpend)}</small></div>) : <p>No coupons yet.</p>}</article></section>}

    {tab === "loyalty" && <section className="growthGrid"><article className="growthCard"><span className="growthLabel">LOYALTY PROGRAMME</span><h2>Configure customer rewards</h2><form onSubmit={saveLoyalty} className="growthForm"><label className="loyaltyCheck"><input name="enabled" type="checkbox" defaultChecked={data.settings.loyaltyEnabled} /> Enable loyalty programme</label><div><label>Points per €1<input name="pointsPerEuro" type="number" min="0" defaultValue={data.settings.loyaltyPointsPerEuro} /></label><label>Reward at points<input name="rewardPoints" type="number" min="1" defaultValue={data.settings.loyaltyRewardPoints} /></label></div><div><label>Reward value (€)<input name="rewardValue" type="number" min="0" step="0.5" defaultValue={data.settings.loyaltyRewardValue} /></label><label>Signup bonus<input name="signupBonus" type="number" min="0" defaultValue={data.settings.loyaltySignupBonus} /></label></div><button disabled={busy}>Save loyalty settings</button></form></article><article className="growthCard"><span className="growthLabel">LOYALTY OVERVIEW</span><h2>Programme health</h2><div className="segmentMetrics"><div><small>Members</small><strong>{data.customers.length}</strong></div><div><small>Points issued</small><strong>{totalPoints}</strong></div><div><small>Reward value</small><strong>{euro(data.settings.loyaltyRewardValue)}</strong></div></div><Link className="growthButton" href={`/r/${slug}/customers`}>Open customer CRM</Link></article></section>}
  </main>;
}
