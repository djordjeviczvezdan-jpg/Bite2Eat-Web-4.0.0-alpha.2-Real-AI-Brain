"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { categories, type MenuItem } from "@/data/menu";
import {
  defaultSettings,
  loadMenu,
  loadOpeningHours,
  loadSettings,
  resetMenu,
  saveMenu,
  saveOpeningHours,
  saveSettings,
  type OpeningHour,
  type RestaurantSettings
} from "@/lib/menu-store";
import { getOrders, subscribeToOrders } from "@/lib/order-store";
import type { RestaurantOrder } from "@/lib/order-types";
import { getActiveTenant } from "@/lib/tenant-context";
import { subscribeToLiveEvents } from "@/lib/live-events";

type Tab = "overview" | "menu" | "orders" | "settings";


function paymentLabel(order: RestaurantOrder) {
  if (order.paymentMethod === "cash") return "Cash";
  switch (order.paymentStatus) {
    case "paid": return "Paid";
    case "failed": return "Failed";
    case "refunded": return "Refunded";
    default: return "Pending";
  }
}

function paymentClass(order: RestaurantOrder) {
  if (order.paymentMethod === "cash") return "cash";
  return order.paymentStatus ?? "pending";
}

function euro(value: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<RestaurantOrder[]>([]);
  const [settings, setSettings] = useState<RestaurantSettings>(defaultSettings);
  const [savedMessage, setSavedMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ownerName, setOwnerName] = useState("restaurant owner");
  const [liveNotice, setLiveNotice] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState("All");
  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([]);
  const [generatingImageIds, setGeneratingImageIds] = useState<number[]>([]);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(data => { if (data?.user?.name) setOwnerName(data.user.name); });
    loadMenu().then(setMenu);
    loadSettings().then(setSettings);
    loadOpeningHours().then(setOpeningHours).catch(() => setOpeningHours([]));
    const refreshOrders = () => { getOrders().then(setOrders); };
    refreshOrders();
    return subscribeToOrders(refreshOrders);
  }, []);

  const menuCategories = useMemo(() => ["All", ...Array.from(new Set(menu.map((item) => item.category))).sort()], [menu]);
  const filteredMenu = useMemo(() => menu.filter((item) => {
    const matchesSearch = `${item.name} ${item.description}`.toLowerCase().includes(menuSearch.toLowerCase());
    const matchesCategory = menuCategory === "All" || item.category === menuCategory;
    return matchesSearch && matchesCategory;
  }), [menu, menuCategory, menuSearch]);

  const liveOrders = orders.filter((order) => order.status !== "completed");
  const completedOrders = orders.filter((order) => order.status === "completed");
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const averageOrder = orders.length ? revenue / orders.length : 0;

  const itemSales = useMemo(() => {
    const counts = new Map<number, { name: string; quantity: number }>();
    orders.forEach((order) =>
      order.items.forEach((item) => {
        const current = counts.get(item.id) ?? { name: item.name, quantity: 0 };
        counts.set(item.id, { ...current, quantity: current.quantity + item.quantity });
      })
    );
    return [...counts.values()].sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  function flash(message: string) {
    setSavedMessage(message);
    window.setTimeout(() => setSavedMessage(""), 2200);
  }

  function updateMenuItem(id: number, patch: Partial<MenuItem>) {
    setMenu((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  async function persistMenu() {
    await saveMenu(menu);
    flash("Menu changes are live in PostgreSQL.");
  }

  function addMenuItem() {
    const nextId = Math.max(0, ...menu.map((item) => item.id)) + 1;
    const item: MenuItem = {
      id: nextId,
      name: "New menu item",
      description: "Add a description for this dish.",
      price: 9.95,
      category: "Burgers",
      emoji: "🍽️",
      available: true
    };
    setMenu((current) => [...current, item]);
    setEditingId(nextId);
  }

  function duplicateMenuItem(item: MenuItem) {
    const nextId = Math.max(0, ...menu.map((entry) => entry.id)) + 1;
    const copy = { ...item, id: nextId, name: `${item.name} copy`, badge: undefined };
    setMenu((current) => [...current, copy]);
    setEditingId(nextId);
    flash("Menu item duplicated. Review it, then save and publish.");
  }

  function removeMenuItem(id: number) {
    if (!window.confirm("Delete this menu item?")) return;
    const next = menu.filter((item) => item.id !== id);
    setMenu(next);
    void saveMenu(next);
    flash("Menu item deleted.");
  }

  async function generateFoodImage(item: MenuItem, quiet = false) {
    setGeneratingImageIds((current) => current.includes(item.id) ? current : [...current, item.id]);
    try {
      const slug = getActiveTenant();
      const response = await fetch(`/api/restaurants/${slug}/menu/${item.id}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: item.name, description: item.description, category: item.category })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Image generation failed");
      updateMenuItem(item.id, { imageUrl: data.imageUrl });
      if (!quiet) flash(`Realistic food photo generated for ${item.name}.`);
      return true;
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Image generation failed");
      return false;
    } finally {
      setGeneratingImageIds((current) => current.filter((id) => id !== item.id));
    }
  }

  async function generateMissingFoodImages() {
    const missing = menu.filter((item) => !item.imageUrl);
    if (!missing.length) return flash("Every menu item already has a food photo.");
    if (!window.confirm(`Generate realistic photos for ${missing.length} missing menu items? Image API charges may apply.`)) return;
    setBulkGenerating(true);
    let completed = 0;
    for (const item of missing) {
      const ok = await generateFoodImage(item, true);
      if (!ok) break;
      completed += 1;
    }
    setBulkGenerating(false);
    flash(`${completed} food photo${completed === 1 ? "" : "s"} generated and saved.`);
  }

  async function persistSettings(event: FormEvent) {
    event.preventDefault();
    await Promise.all([saveSettings(settings), saveOpeningHours(openingHours)]);
    flash("Restaurant settings and opening hours saved.");
  }

  function updateOpeningHour(dayOfWeek: number, patch: Partial<OpeningHour>) {
    setOpeningHours((current) => current.map((hour) => hour.dayOfWeek === dayOfWeek ? { ...hour, ...patch } : hour));
  }

  useEffect(() => {
    return subscribeToLiveEvents((event) => {
      if (event.type === "order-created") {
        setLiveNotice(`New order #${event.orderNumber} · €${event.total.toFixed(2)} from ${event.customerName}`);
        setTimeout(() => setLiveNotice(null), 6000);
      }
    });
  }, []);


  return (
    <main className="adminShell">
      <aside className="adminSidebar">
        <div className="adminBrand">
          <span>TA</span>
          <div><strong>Bite2Eat</strong><small>Restaurant OS</small></div>
        </div>
        <div className={`adminOpenStatus ${settings.acceptingOrders ? "open" : "closed"}`}>
          <i /> {settings.acceptingOrders ? "Accepting orders" : "Orders paused"}
        </div>
        <nav>
          {([
            ["overview", "▦", "Overview"],
            ["menu", "☰", "Menu manager"],
            ["orders", "▤", "Order history"],
            ["settings", "⚙", "Restaurant settings"]
          ] as [Tab, string, string][]).map(([value, icon, label]) => (
            <button
              key={value}
              className={tab === value ? "active" : ""}
              onClick={() => setTab(value)}
            >
              <span>{icon}</span>{label}
            </button>
          ))}
        </nav>
        <div className="adminSidebarBottom">
          <Link href={`/r/${getActiveTenant()}/coach`}>AI Restaurant Coach ↗</Link><Link href={`/r/${getActiveTenant()}/analytics`}>Open analytics ↗</Link><Link href={`/r/${getActiveTenant()}/marketing`}>Loyalty & marketing ↗</Link>{settings.inventoryEnabled && <Link href={`/r/${getActiveTenant()}/inventory`}>Inventory & suppliers ↗</Link>}{settings.recipeCostingEnabled && <Link href={`/r/${getActiveTenant()}/profitability`}>Profitability ↗</Link>}
          <Link href={`/r/${getActiveTenant()}/kitchen`}>Open kitchen display ↗</Link>
          <Link href={`/r/${getActiveTenant()}`}>View customer website ↗</Link>
          <button onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; }}>Sign out</button>
        </div>
      </aside>

      <section className="adminMain">
        <header className="adminHeader">
          <div>
            <span className="adminEyebrow">{(settings.restaurantName).toUpperCase()}</span>
            <h1>
              {tab === "overview" && `Good afternoon, ${ownerName}.`}
              {tab === "menu" && "Menu manager"}
              {tab === "orders" && "Order history"}
              {tab === "settings" && "Restaurant settings"}
            </h1>
          </div>
          <div className="adminHeaderActions">
            {savedMessage && <span className="saveToast">✓ {savedMessage}</span>}
            <button
              className={settings.acceptingOrders ? "pauseButton" : "openButton"}
              onClick={() => {
                const next = { ...settings, acceptingOrders: !settings.acceptingOrders };
                setSettings(next);
                void saveSettings(next);
              }}
            >
              {settings.acceptingOrders ? "Pause orders" : "Start accepting orders"}
            </button>
          </div>
        </header>

        {tab === "overview" && (
          <>
            <div className="adminMetrics">
              <article><span>Revenue</span><strong>{euro(revenue)}</strong><small>From demo orders</small></article>
              <article><span>Total orders</span><strong>{orders.length}</strong><small>{liveOrders.length} currently active</small></article>
              <article><span>Average order</span><strong>{euro(averageOrder)}</strong><small>Across all orders</small></article>
              <article><span>Menu availability</span><strong>{menu.filter((item) => item.available !== false).length}/{menu.length}</strong><small>Items available</small></article>
            </div>

            <div className="adminOverviewGrid">
              <article className="adminPanel">
                <div className="panelHeading"><div><span>LIVE OPERATIONS</span><h2>Active orders</h2></div><Link href={`/r/${getActiveTenant()}/kitchen`}>Kitchen display ↗</Link></div>
                <div className="overviewOrders">
                  {liveOrders.length === 0 ? (
                    <div className="adminEmpty">No active orders yet.</div>
                  ) : liveOrders.slice(0, 5).map((order) => (
                    <div key={order.id}>
                      <b>#{order.orderNumber}</b>
                      <span>{order.customer.name}</span>
                      <small>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</small>
                      <span className={`paymentStatusPill ${paymentClass(order)}`}>{paymentLabel(order)}</span>
                      <em>{order.status.replaceAll("-", " ")}</em>
                      <strong>{euro(order.total)}</strong>
                    </div>
                  ))}
                </div>
              </article>

              <article className="adminPanel">
                <div className="panelHeading"><div><span>MENU INTELLIGENCE</span><h2>Best sellers</h2></div></div>
                <div className="bestSellerList">
                  {(itemSales.length ? itemSales : menu.slice(0, 5).map((item, i) => ({ name: item.name, quantity: 12 - i * 2 }))).slice(0, 5).map((item, index) => (
                    <div key={item.name}>
                      <span>{index + 1}</span>
                      <strong>{item.name}</strong>
                      <div><i style={{ width: `${Math.max(18, 100 - index * 17)}%` }} /></div>
                      <small>{item.quantity} sold</small>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <article className="adminPanel adminInsight">
              <div className="insightIcon">✦</div>
              <div>
                <span>BITE2EAT INSIGHT</span>
                <h2>Your strongest opportunity today</h2>
                <p>Customers ordering burgers frequently add a drink but skip a side. Offer Loaded Garlic Fries as a one-click recommendation to increase average order value.</p>
              </div>
              <button onClick={() => setTab("menu")}>Review menu</button>
            </article>
          </>
        )}

        {tab === "menu" && (
          <div className="adminPanel menuManager">
            <div className="menuManagerToolbar">
              <div>
                <span className="adminEyebrow">CUSTOMER MENU</span>
                <h2>{menu.length} menu items</h2>
                <p>Search, edit, duplicate and mark products sold out. Changes go live after saving.</p>
              </div>
              <div>
                <button className="aiFoodButton" disabled={bulkGenerating} onClick={generateMissingFoodImages}>{bulkGenerating ? "Generating photos…" : "✨ Generate missing photos"}</button>
                <button className="secondaryAdminButton" onClick={addMenuItem}>+ Add item</button>
                <button className="primaryAdminButton" onClick={persistMenu}>Save & publish</button>
              </div>
            </div>

            <div className="menuFilterBar">
              <input value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} placeholder="Search products..." />
              <select value={menuCategory} onChange={(event) => setMenuCategory(event.target.value)}>
                {menuCategories.map((category) => <option key={category}>{category}</option>)}
              </select>
              <span>{filteredMenu.length} shown</span>
            </div>

            <div className="adminMenuList">
              {filteredMenu.map((item) => {
                const editing = editingId === item.id;
                return (
                  <article className={`adminMenuItem ${item.available === false ? "soldOut" : ""}`} key={item.id}>
                    <div className="adminFoodIcon">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : item.emoji}</div>
                    <div className="adminMenuDetails">
                      {editing ? (
                        <div className="menuEditGrid">
                          <label>Name<input value={item.name} onChange={(e) => updateMenuItem(item.id, { name: e.target.value })} /></label>
                          <label>Price<input type="number" step=".05" value={item.price} onChange={(e) => updateMenuItem(item.id, { price: Number(e.target.value) })} /></label>
                          <label>Category<input list="menu-categories" value={item.category} onChange={(e) => updateMenuItem(item.id, { category: e.target.value })} /><datalist id="menu-categories">{menuCategories.filter(category => category !== "All").map((category) => <option key={category} value={category} />)}</datalist></label>
                          <label>Fallback emoji<input value={item.emoji} onChange={(e) => updateMenuItem(item.id, { emoji: e.target.value })} /></label><label>Food image URL<input value={item.imageUrl ?? ""} onChange={(e) => updateMenuItem(item.id, { imageUrl: e.target.value || undefined })} placeholder="https://..." /></label>
                          <label className="wideEditField">Description<textarea value={item.description} onChange={(e) => updateMenuItem(item.id, { description: e.target.value })} /></label>
                          <label>Badge<input value={item.badge ?? ""} onChange={(e) => updateMenuItem(item.id, { badge: e.target.value || undefined })} /></label>
                        </div>
                      ) : (
                        <>
                          <div><h3>{item.name}</h3>{item.badge && <span>{item.badge}</span>}</div>
                          <p>{item.description}</p>
                          <small>{item.category} · {euro(item.price)}</small>
                        </>
                      )}
                    </div>
                    <div className="adminMenuActions">
                      <label className="availabilitySwitch">
                        <input
                          type="checkbox"
                          checked={item.available !== false}
                          onChange={(event) => updateMenuItem(item.id, { available: event.target.checked })}
                        />
                        <span />
                        {item.available !== false ? "Available" : "Sold out"}
                      </label>
                      <button className="generatePhotoButton" disabled={generatingImageIds.includes(item.id)} onClick={() => generateFoodImage(item)}>{generatingImageIds.includes(item.id) ? "Creating…" : item.imageUrl ? "✨ Regenerate photo" : "✨ Generate photo"}</button>
                      <button onClick={() => setEditingId(editing ? null : item.id)}>{editing ? "Done" : "Edit"}</button>
                      <button onClick={() => duplicateMenuItem(item)}>Duplicate</button>
                      <button className="dangerText" onClick={() => removeMenuItem(item.id)}>Delete</button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="menuManagerFooter">
              <button onClick={() => {
                if (!window.confirm("Reset the entire menu to the original demo menu?")) return;
                resetMenu();
                loadMenu().then(setMenu);
                flash("Original menu restored.");
              }}>Restore original menu</button>
              <button className="primaryAdminButton" onClick={persistMenu}>Save & publish changes</button>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="adminPanel ordersTablePanel">
            <div className="panelHeading">
              <div><span>ORDER LOG</span><h2>All orders</h2></div>
              <strong>{completedOrders.length} completed</strong>
            </div>
            <div className="adminOrdersTable">
              <div className="tableHeader"><span>Order</span><span>Customer</span><span>Type</span><span>Order status</span><span>Payment</span><span>Placed</span><span>Total</span></div>
              {orders.map((order) => (
                <div key={order.id}>
                  <b>#{order.orderNumber}</b>
                  <span>{order.customer.name}<small>{order.customer.phone}</small></span>
                  <span>{order.fulfilment}</span>
                  <em className={`orderStatusPill ${order.status}`}>{order.status.replaceAll("-", " ")}</em>
                  <span className={`paymentStatusPill ${paymentClass(order)}`}>{paymentLabel(order)}</span>
                  <span>{new Date(order.createdAt).toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" })}</span>
                  <strong>{euro(order.total)}</strong>
                </div>
              ))}
              {orders.length === 0 && <div className="adminEmpty">Place an order through the storefront to see it here.</div>}
            </div>
          </div>
        )}

        {tab === "settings" && (
          <form className="adminSettingsGrid" onSubmit={persistSettings}>
            <article className="adminPanel settingsPanel">
              <div className="panelHeading"><div><span>BUSINESS PROFILE</span><h2>Restaurant details</h2></div></div>
              <div className="settingsFields">
                <label>Restaurant name<input value={settings.restaurantName} onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })} /></label>
                <label>Storefront tagline<input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} /></label>
                <label>Phone number<input value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} /></label>
                <label>Location<input value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} /></label>
              </div>
            </article>

            <article className="adminPanel settingsPanel">
              <div className="panelHeading"><div><span>ORDERING</span><h2>Fees and timings</h2></div></div>
              <div className="settingsFields twoColumnSettings">
                <label>Delivery fee (€)<input type="number" step=".5" value={settings.deliveryFee} onChange={(e) => setSettings({ ...settings, deliveryFee: Number(e.target.value) })} /></label>
                <label>Free delivery over (€)<input type="number" step="1" value={settings.freeDeliveryThreshold} onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })} /></label>
                <label>Minimum order (€)<input type="number" step="1" value={settings.minimumOrder} onChange={(e) => setSettings({ ...settings, minimumOrder: Number(e.target.value) })} /></label>
                <label>Delivery time<input value={settings.deliveryMinutes} onChange={(e) => setSettings({ ...settings, deliveryMinutes: e.target.value })} /></label>
                <label>Collection time<input value={settings.collectionMinutes} onChange={(e) => setSettings({ ...settings, collectionMinutes: e.target.value })} /></label>
              </div>
            </article>

            <article className="adminPanel settingsPanel openingHoursPanel">
              <div className="panelHeading"><div><span>OPENING HOURS</span><h2>Weekly schedule</h2></div></div>
              <div className="openingHoursList">
                {openingHours.map((hour) => {
                  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                  return <div className="openingHourRow" key={hour.dayOfWeek}>
                    <strong>{dayNames[hour.dayOfWeek]}</strong>
                    <label className="closedToggle"><input type="checkbox" checked={hour.isClosed} onChange={(event) => updateOpeningHour(hour.dayOfWeek, { isClosed: event.target.checked })} /> Closed</label>
                    <input type="time" disabled={hour.isClosed} value={hour.opensAt} onChange={(event) => updateOpeningHour(hour.dayOfWeek, { opensAt: event.target.value })} />
                    <span>to</span>
                    <input type="time" disabled={hour.isClosed} value={hour.closesAt} onChange={(event) => updateOpeningHour(hour.dayOfWeek, { closesAt: event.target.value })} />
                  </div>;
                })}
              </div>
            </article>

            <article className="adminPanel settingsPanel moduleSettings">
              <div className="panelHeading"><div><span>OPTIONAL MODULES</span><h2>Choose how much of Bite2Eat to use</h2></div></div>
              <p className="moduleIntro">Start simple and enable extra operations tools whenever the restaurant is ready. Turning a module off hides it without deleting its data.</p>
              <label className={`moduleToggleCard ${settings.inventoryEnabled ? "enabled" : ""}`}>
                <span className="moduleIcon">📦</span>
                <span className="moduleCopy"><strong>Inventory & suppliers</strong><small>Track ingredients, stock levels, suppliers, waste and stock movements.</small><em>{settings.inventoryEnabled ? "Enabled" : "Optional"}</em></span>
                <input type="checkbox" checked={settings.inventoryEnabled} onChange={(e) => setSettings({ ...settings, inventoryEnabled: e.target.checked })} />
              </label>
              <label className={`moduleToggleCard ${settings.recipeCostingEnabled ? "enabled" : ""} ${!settings.inventoryEnabled ? "disabled" : ""}`}>
                <span className="moduleIcon">🍔</span>
                <span className="moduleCopy"><strong>Recipes & automatic stock</strong><small>Build recipes, see food cost and deduct ingredients when orders are completed.</small><em>{!settings.inventoryEnabled ? "Requires Inventory" : settings.recipeCostingEnabled ? "Enabled" : "Optional"}</em></span>
                <input type="checkbox" disabled={!settings.inventoryEnabled} checked={settings.recipeCostingEnabled} onChange={(e) => setSettings({ ...settings, recipeCostingEnabled: e.target.checked })} />
              </label>
              <div className="moduleComingSoon"><span>Coming next</span><small>Purchase orders, delivery fleet and AI Restaurant Coach will use the same optional-module system.</small></div>
            </article>

            <article className="adminPanel settingsPanel paymentSettings">
              <div className="panelHeading"><div><span>PAYMENTS</span><h2>Accepted methods</h2></div></div>
              <label className="settingToggle"><span><strong>Card payments</strong><small>{settings.stripeChargesEnabled ? "Stripe connected" : "Stripe test checkout ready"}</small></span><input type="checkbox" checked={settings.cardEnabled} onChange={(e) => setSettings({ ...settings, cardEnabled: e.target.checked })} /></label>
              <label className="settingToggle"><span><strong>Cash payments</strong><small>Pay on delivery or collection</small></span><input type="checkbox" checked={settings.cashEnabled} onChange={(e) => setSettings({ ...settings, cashEnabled: e.target.checked })} /></label>
              <label>Minimum card order (€)<input type="number" min="0" step="1" value={settings.minimumCardOrder} onChange={(e) => setSettings({ ...settings, minimumCardOrder: Number(e.target.value) })} /></label>
              <div className="kitchenReleaseSetting">
                <span className="adminEyebrow">KITCHEN RELEASE RULE</span>
                <label className={`releaseChoice ${settings.requireCardPaymentBeforeKitchen ? "selected" : ""}`}>
                  <input type="radio" name="kitchen-release" checked={settings.requireCardPaymentBeforeKitchen} onChange={() => setSettings({ ...settings, requireCardPaymentBeforeKitchen: true })} />
                  <span><strong>Only after successful card payment</strong><small>Recommended. Pending, cancelled and failed card orders stay out of the kitchen.</small></span>
                </label>
                <label className={`releaseChoice ${!settings.requireCardPaymentBeforeKitchen ? "selected" : ""}`}>
                  <input type="radio" name="kitchen-release" checked={!settings.requireCardPaymentBeforeKitchen} onChange={() => setSettings({ ...settings, requireCardPaymentBeforeKitchen: false })} />
                  <span><strong>Immediately when checkout starts</strong><small>Card orders can reach the kitchen while payment is still pending. Failed payments are hidden.</small></span>
                </label>
                <p className="releasePolicyNote">Cash orders always go to the kitchen immediately when cash payments are enabled.</p>
              </div>
            </article>

            <div className="settingsSaveBar">
              <span>Changes are saved for this restaurant and update the live storefront.</span>
              <button className="primaryAdminButton">Save restaurant settings</button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
