"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  name: string; cuisine: string | null; phone: string | null; address: string | null; postcode: string | null;
  tagline: string | null; website: string | null; accentColor: string; deliveryFee: number; minimumOrder: number;
  freeDeliveryThreshold: number | null; deliveryRadiusKm: number | null; deliveryMinutes: string | null;
  collectionMinutes: string | null; cashEnabled: boolean; cardEnabled: boolean; onboardingCompleted: boolean; onboardingStep: number;
};
const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function OnboardingWizard({ slug, initial }: { slug: string; initial: Initial }) {
  const router = useRouter();
  const [step, setStep] = useState(Math.max(1, Math.min(5, initial.onboardingStep || 1)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [business, setBusiness] = useState({ name: initial.name, cuisine: initial.cuisine || "", phone: initial.phone || "", address: initial.address || "", postcode: initial.postcode || "", website: initial.website || "", tagline: initial.tagline || "" });
  const [accentColor, setAccentColor] = useState(initial.accentColor || "#ffce43");
  const [fulfilment, setFulfilment] = useState({ deliveryFee: initial.deliveryFee, minimumOrder: initial.minimumOrder, freeDeliveryThreshold: initial.freeDeliveryThreshold, deliveryRadiusKm: initial.deliveryRadiusKm, deliveryMinutes: initial.deliveryMinutes || "25–40 min", collectionMinutes: initial.collectionMinutes || "15–20 min", cashEnabled: initial.cashEnabled, cardEnabled: initial.cardEnabled });
  const [hours, setHours] = useState(days.map((_, dayOfWeek) => ({ dayOfWeek, isClosed: false, opensAt: "12:00", closesAt: dayOfWeek >= 4 ? "00:00" : "23:00" })));
  const progress = useMemo(() => `${Math.round((step / 5) * 100)}%`, [step]);

  async function save(nextStep = step + 1, complete = false) {
    setSaving(true); setError("");
    const payload: Record<string, unknown> = { step, complete };
    if (step === 1) payload.business = business;
    if (step === 2) payload.brand = { accentColor };
    if (step === 3) payload.fulfilment = fulfilment;
    if (step === 4) payload.hours = hours;
    try {
      const response = await fetch(`/api/restaurants/${slug}/onboarding`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      if (complete) { router.push(`/r/${slug}/admin`); router.refresh(); return; }
      setStep(Math.min(5, nextStep));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save."); }
    finally { setSaving(false); }
  }

  return <main className="onboardingPage">
    <aside className="onboardingAside">
      <div className="saasLogo"><span>B2</span><strong>Bite2Eat</strong></div>
      <div><span className="adminEyebrow">RESTAURANT LAUNCH</span><h1>Go live in minutes.</h1><p>Complete the essentials once. You can refine every setting later from your dashboard.</p></div>
      <ol>{["Business", "Brand", "Ordering", "Hours", "Launch"].map((label, index) => <li key={label} className={step === index + 1 ? "active" : step > index + 1 ? "done" : ""}><i>{step > index + 1 ? "✓" : index + 1}</i><span>{label}</span></li>)}</ol>
      <div className="onboardingProgress"><span style={{ width: progress }} /></div>
    </aside>
    <section className="onboardingMain">
      <div className="onboardingCard">
        {step === 1 && <><span className="adminEyebrow">STEP 1 OF 5</span><h2>Tell us about the takeaway</h2><p>This information powers the storefront, receipts and customer communications.</p><div className="onboardingGrid"><label>Business name<input value={business.name} onChange={e => setBusiness({ ...business, name: e.target.value })} /></label><label>Cuisine<input placeholder="Pizza, burgers, kebabs" value={business.cuisine} onChange={e => setBusiness({ ...business, cuisine: e.target.value })} /></label><label>Phone<input value={business.phone} onChange={e => setBusiness({ ...business, phone: e.target.value })} /></label><label>Postcode<input value={business.postcode} onChange={e => setBusiness({ ...business, postcode: e.target.value })} /></label><label className="wide">Address<input value={business.address} onChange={e => setBusiness({ ...business, address: e.target.value })} /></label><label className="wide">Website<input placeholder="https://" value={business.website} onChange={e => setBusiness({ ...business, website: e.target.value })} /></label><label className="wide">Tagline<input placeholder="Fresh food, ordered direct" value={business.tagline} onChange={e => setBusiness({ ...business, tagline: e.target.value })} /></label></div></>}
        {step === 2 && <><span className="adminEyebrow">STEP 2 OF 5</span><h2>Make it feel like your brand</h2><p>Your chosen colour is applied across the customer website and owner dashboard.</p><div className="brandPicker"><input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} /><div style={{ "--preview-accent": accentColor } as React.CSSProperties}><span>{business.name.charAt(0) || "B"}</span><strong>{business.name || "Your takeaway"}</strong><button>Order now</button></div></div></>}
        {step === 3 && <><span className="adminEyebrow">STEP 3 OF 5</span><h2>Configure online ordering</h2><p>Set sensible defaults now. Delivery zones can be made more precise later.</p><div className="onboardingGrid"><label>Delivery fee (€)<input type="number" min="0" step="0.5" value={fulfilment.deliveryFee} onChange={e => setFulfilment({ ...fulfilment, deliveryFee: Number(e.target.value) })} /></label><label>Minimum order (€)<input type="number" min="0" step="1" value={fulfilment.minimumOrder} onChange={e => setFulfilment({ ...fulfilment, minimumOrder: Number(e.target.value) })} /></label><label>Free delivery over (€)<input type="number" min="0" step="1" value={fulfilment.freeDeliveryThreshold ?? ""} onChange={e => setFulfilment({ ...fulfilment, freeDeliveryThreshold: e.target.value ? Number(e.target.value) : null })} /></label><label>Delivery radius (km)<input type="number" min="0" step="0.5" value={fulfilment.deliveryRadiusKm ?? ""} onChange={e => setFulfilment({ ...fulfilment, deliveryRadiusKm: e.target.value ? Number(e.target.value) : null })} /></label><label>Delivery estimate<input value={fulfilment.deliveryMinutes} onChange={e => setFulfilment({ ...fulfilment, deliveryMinutes: e.target.value })} /></label><label>Collection estimate<input value={fulfilment.collectionMinutes} onChange={e => setFulfilment({ ...fulfilment, collectionMinutes: e.target.value })} /></label></div><div className="toggleRow"><label><input type="checkbox" checked={fulfilment.cashEnabled} onChange={e => setFulfilment({ ...fulfilment, cashEnabled: e.target.checked })} /> Cash orders</label><label><input type="checkbox" checked={fulfilment.cardEnabled} onChange={e => setFulfilment({ ...fulfilment, cardEnabled: e.target.checked })} /> Card orders</label></div></>}
        {step === 4 && <><span className="adminEyebrow">STEP 4 OF 5</span><h2>Set regular opening hours</h2><p>Customers will only be able to order when the takeaway is open.</p><div className="hoursList">{hours.map((hour, index) => <div key={hour.dayOfWeek}><strong>{days[index]}</strong><label><input type="checkbox" checked={!hour.isClosed} onChange={e => setHours(hours.map((h, i) => i === index ? { ...h, isClosed: !e.target.checked } : h))} /> Open</label><input type="time" disabled={hour.isClosed} value={hour.opensAt || ""} onChange={e => setHours(hours.map((h, i) => i === index ? { ...h, opensAt: e.target.value } : h))} /><span>to</span><input type="time" disabled={hour.isClosed} value={hour.closesAt || ""} onChange={e => setHours(hours.map((h, i) => i === index ? { ...h, closesAt: e.target.value } : h))} /></div>)}</div></>}
        {step === 5 && <><span className="adminEyebrow">STEP 5 OF 5</span><h2>Your Bite2Eat workspace is ready</h2><p>Next, add or import the menu, test an order and share the direct ordering link.</p><div className="launchSummary"><article><span>Customer website</span><strong>/r/{slug}</strong></article><article><span>Owner dashboard</span><strong>/r/{slug}/admin</strong></article><article><span>Current plan</span><strong>Free pilot</strong></article></div><div className="launchChecklist"><span>✓ Secure owner account</span><span>✓ Tenant-isolated restaurant data</span><span>✓ Ordering and fulfilment defaults</span><span>✓ Ready for menu import</span></div></>}
        {error && <div className="adminError">{error}</div>}
        <footer className="onboardingActions">{step > 1 && <button className="secondaryAdminButton" onClick={() => setStep(step - 1)} disabled={saving}>Back</button>}<button className="primaryAdminButton" disabled={saving || (step === 1 && business.name.trim().length < 2)} onClick={() => save(step + 1, step === 5)}>{saving ? "Saving…" : step === 5 ? "Open my dashboard" : "Save and continue"}</button></footer>
      </div>
    </section>
  </main>;
}
