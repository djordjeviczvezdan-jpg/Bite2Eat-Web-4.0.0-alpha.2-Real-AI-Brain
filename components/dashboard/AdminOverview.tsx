"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MenuItem } from "@/data/menu";
import type { RestaurantOrder } from "@/lib/order-types";
import type { RestaurantSettings } from "@/lib/menu-store";
import { getActiveTenant } from "@/lib/tenant-context";

type Props = {
  menu: MenuItem[];
  orders: RestaurantOrder[];
  settings: RestaurantSettings;
  onOpenMenu: () => void;
  onOpenSettings: () => void;
};

type ActionState = "pending" | "approved" | "dismissed";

function euro(value: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function AdminOverview({
  menu,
  orders,
  settings,
  onOpenMenu,
  onOpenSettings
}: Props) {
  const tenant = getActiveTenant();
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});

  const liveOrders = orders.filter((order) => order.status !== "completed");
  const completedOrders = orders.filter((order) => order.status === "completed");
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const completedRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);
  const averageOrder = orders.length ? revenue / orders.length : 0;
  const availableItems = menu.filter((item) => item.available !== false).length;
  const unavailableItems = menu.length - availableItems;

  const itemSales = useMemo(() => {
    const sales = new Map<number, { name: string; quantity: number; revenue: number }>();

    orders.forEach((order) => {
      order.items.forEach((item) => {
        const current = sales.get(item.id) ?? {
          name: item.name,
          quantity: 0,
          revenue: 0
        };

        sales.set(item.id, {
          name: current.name,
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + item.quantity * (item.price ?? 0)
        });
      });
    });

    return [...sales.values()].sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  const healthScore = clamp(
    70 +
      (settings.acceptingOrders ? 8 : -16) +
      (settings.inventoryEnabled ? 7 : 0) +
      (settings.recipeCostingEnabled ? 4 : 0) +
      (unavailableItems === 0 ? 7 : -Math.min(15, unavailableItems * 3)) +
      (liveOrders.length <= 5 ? 4 : -5),
    45,
    99
  );

  const kitchenLoad = clamp(liveOrders.length * 18, 0, 100);
  const forecast = Math.max(
    revenue,
    revenue * (settings.acceptingOrders ? 1.18 : 1) +
      liveOrders.length * Math.max(averageOrder, 18)
  );
  const strongestSeller = itemSales[0]?.name ?? menu[0]?.name ?? "your top item";

  const actions = [
    {
      id: "operations",
      tone: settings.acceptingOrders ? "positive" : "urgent",
      icon: settings.acceptingOrders ? "✓" : "!",
      title: settings.acceptingOrders
        ? `${liveOrders.length} active order${liveOrders.length === 1 ? "" : "s"}`
        : "Online ordering is paused",
      description: settings.acceptingOrders
        ? liveOrders.length
          ? "Review preparation times and keep kitchen statuses current."
          : "The restaurant is ready for new customer orders."
        : "Customers cannot order until ordering is reopened.",
      label: settings.acceptingOrders ? "Open kitchen" : "Review settings",
      href: settings.acceptingOrders ? `/r/${tenant}/kitchen` : undefined,
      onClick: settings.acceptingOrders ? undefined : onOpenSettings
    },
    {
      id: "menu",
      tone: unavailableItems ? "warning" : "positive",
      icon: unavailableItems ? "!" : "✓",
      title: unavailableItems
        ? `${unavailableItems} unavailable menu item${unavailableItems === 1 ? "" : "s"}`
        : "Full menu availability",
      description: unavailableItems
        ? "Restore products that are ready to sell to protect conversion."
        : `${availableItems} menu items are available to customers.`,
      label: "Review menu",
      onClick: onOpenMenu
    },
    {
      id: "inventory",
      tone: settings.inventoryEnabled ? "positive" : "warning",
      icon: "□",
      title: settings.inventoryEnabled
        ? "Review stock before the next rush"
        : "Enable inventory intelligence",
      description: settings.inventoryEnabled
        ? "Check low-stock ingredients and supplier risks."
        : "Unlock shortage alerts, waste insights and reorder recommendations.",
      label: settings.inventoryEnabled ? "Open inventory" : "Enable inventory",
      href: settings.inventoryEnabled ? `/r/${tenant}/inventory` : undefined,
      onClick: settings.inventoryEnabled ? undefined : onOpenSettings
    }
  ] as const;

  const visibleActions = actions.filter(
    (action) => actionStates[action.id] !== "dismissed"
  );

  return (
    <>
      <section className="commandHero">
        <div className="heroHeader">
          <div className="identity">
            <div className="logo">AI</div>
            <div>
              <span className="adminEyebrow">AI OPERATIONS CENTER</span>
              <h2>Your restaurant command center</h2>
              <p>Live performance, operational risk and the next best actions.</p>
            </div>
          </div>
          <div className="monitoring"><i /> Monitoring active</div>
        </div>

        <div className="heroGrid">
          <article className="health">
            <div
              className="ring"
              style={{
                background: `conic-gradient(#28b487 ${healthScore * 3.6}deg, #e7efec 0deg)`
              }}
            >
              <div><strong>{healthScore}</strong><span>/100</span></div>
            </div>
            <div>
              <span>Restaurant health</span>
              <strong>{healthScore >= 85 ? "Excellent" : healthScore >= 70 ? "Healthy" : "Needs attention"}</strong>
              <small>Ordering, availability, modules and workload.</small>
            </div>
          </article>

          <article className="forecast">
            <span>Predicted closing revenue</span>
            <strong>{euro(forecast)}</strong>
            <small>Live estimate based on current revenue and active orders.</small>
            <em><i /> Live forecast</em>
          </article>

          <article className="pressure">
            <div><span>Kitchen pressure</span><b>{kitchenLoad}%</b></div>
            <strong>{kitchenLoad >= 75 ? "High pressure" : kitchenLoad >= 40 ? "Busy" : "Under control"}</strong>
            <div className="track"><i style={{ width: `${Math.max(5, kitchenLoad)}%` }} /></div>
            <small>{liveOrders.length} active orders in progress</small>
          </article>
        </div>
      </section>

      <div className="metrics">
        <article><span>Revenue</span><strong>{euro(revenue)}</strong><small>{euro(completedRevenue)} completed</small></article>
        <article><span>Total orders</span><strong>{orders.length}</strong><small>{liveOrders.length} active</small></article>
        <article><span>Average order</span><strong>{euro(averageOrder)}</strong><small>Target opportunity: +10%</small></article>
        <article><span>Menu availability</span><strong>{availableItems}/{menu.length}</strong><small>{unavailableItems ? `${unavailableItems} unavailable` : "Full menu live"}</small></article>
      </div>

      <div className="topGrid">
        <article className="panel">
          <div className="panelHeading">
            <div><span>LIVE SALES</span><h2>Revenue momentum</h2></div>
            <Link href={`/r/${tenant}/analytics`}>Open analytics ↗</Link>
          </div>
          <div className="momentum">
            {[35, 52, 44, 72, 94, 63].map((height, index) => (
              <div key={index}>
                <i style={{ height: `${orders.length ? Math.max(12, height - index * 2) : height}%` }} />
                <span>{12 + index * 2}:00</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel brief">
          <div className="briefTitle"><b>✦</b><div><span>AI DAILY BRIEF</span><h2>What matters now</h2></div></div>
          <p><strong>{strongestSeller}</strong> is your strongest menu opportunity.</p>
          <p>Kitchen pressure is <strong>{kitchenLoad >= 75 ? "high" : kitchenLoad >= 40 ? "moderate" : "low"}</strong>.</p>
          <p>{unavailableItems ? `${unavailableItems} unavailable items may reduce conversion.` : "Full menu availability supports conversion."}</p>
          <Link href={`/r/${tenant}/coach`}>Ask AI Restaurant Coach</Link>
        </article>
      </div>

      <section className="manager">
        <div className="managerHeader">
          <div><span className="adminEyebrow">RECOMMENDED ACTIONS</span><h2>AI manager priorities</h2></div>
          <b>{visibleActions.length} pending</b>
        </div>

        <div className="actions">
          {visibleActions.map((action) => {
            const state = actionStates[action.id] ?? "pending";
            return (
              <article className={`${action.tone} ${state}`} key={action.id}>
                <div className="actionIcon">{action.icon}</div>
                <div className="copy">
                  <h3>{action.title} {state === "approved" && <em>Approved</em>}</h3>
                  <p>{action.description}</p>
                </div>
                <div className="buttons">
                  {action.href ? (
                    <Link href={action.href}>{action.label}</Link>
                  ) : (
                    <button onClick={action.onClick}>{action.label}</button>
                  )}
                  {state === "pending" && (
                    <button
                      className="approve"
                      onClick={() => setActionStates((current) => ({ ...current, [action.id]: "approved" }))}
                    >
                      Approve
                    </button>
                  )}
                  <button
                    className="dismiss"
                    onClick={() => setActionStates((current) => ({ ...current, [action.id]: "dismissed" }))}
                  >
                    Dismiss
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="bottomGrid">
        <article className="panel">
          <div className="panelHeading">
            <div><span>LIVE OPERATIONS</span><h2>Active orders</h2></div>
            <Link href={`/r/${tenant}/kitchen`}>Kitchen display ↗</Link>
          </div>
          <div className="orderList">
            {liveOrders.length ? liveOrders.slice(0, 5).map((order) => (
              <div key={order.id}>
                <b>#{order.orderNumber}</b>
                <span>{order.customer.name}</span>
                <small>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</small>
                <em>{order.status.replaceAll("-", " ")}</em>
                <strong>{euro(order.total)}</strong>
              </div>
            )) : <div className="empty">No active orders yet.</div>}
          </div>
        </article>

        <article className="panel">
          <div className="panelHeading">
            <div><span>MENU INTELLIGENCE</span><h2>Best sellers</h2></div>
            <button onClick={onOpenMenu}>Open menu ↗</button>
          </div>
          <div className="sellerList">
            {(itemSales.length ? itemSales : menu.slice(0, 5).map((item, index) => ({
              name: item.name,
              quantity: 12 - index * 2,
              revenue: (12 - index * 2) * item.price
            }))).slice(0, 5).map((item, index) => (
              <div key={item.name}>
                <span>{index + 1}</span>
                <strong>{item.name}</strong>
                <i><b style={{ width: `${Math.max(24, 100 - index * 17)}%` }} /></i>
                <small>{item.quantity} sold · {euro(item.revenue)}</small>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="opportunity">
        <b>↗</b>
        <div>
          <span>GROWTH OPPORTUNITY</span>
          <h2>Increase average order value with a targeted add-on</h2>
          <p>Promote a side or drink beside {strongestSeller} to increase attachment rate.</p>
        </div>
        <Link href={`/r/${tenant}/marketing`}>Create campaign</Link>
      </article>

      <style jsx>{`
        .commandHero,.manager,.panel{border:1px solid #dfe8e4;border-radius:22px;background:#fff;box-shadow:0 16px 42px rgba(20,53,44,.07)}
        .commandHero{overflow:hidden;margin-bottom:20px;background:radial-gradient(circle at 95% 0,rgba(43,188,143,.17),transparent 31%),linear-gradient(140deg,#fff,#f5fbf8)}
        .heroHeader{display:flex;justify-content:space-between;gap:20px;padding:27px}.identity{display:flex;gap:15px}.logo{display:grid;width:54px;height:54px;place-items:center;border-radius:17px;background:#15382f;color:#fff;font-weight:900}
        .identity h2{margin:5px 0;color:#17322b;font-size:25px}.identity p{margin:0;color:#6c7e78}.monitoring,.forecast em{display:flex;align-items:center;gap:8px;align-self:flex-start;border:1px solid #c6e8dc;border-radius:999px;padding:8px 12px;background:#f0faf7;color:#19765a;font-size:12px;font-weight:800;font-style:normal}.monitoring i,.forecast em i{width:8px;height:8px;border-radius:50%;background:#28b487;box-shadow:0 0 0 5px rgba(40,180,135,.12)}
        .heroGrid{display:grid;grid-template-columns:1.1fr 1fr 1fr;border-top:1px solid #e4ece9;background:rgba(255,255,255,.72)}.heroGrid article{min-height:145px;padding:23px;border-right:1px solid #e4ece9}.heroGrid article:last-child{border-right:0}
        .health{display:flex;align-items:center;gap:18px}.ring{display:grid;flex:0 0 90px;width:90px;height:90px;place-items:center;border-radius:50%}.ring>div{display:flex;align-items:baseline;justify-content:center;width:68px;height:68px;border-radius:50%;background:#fff}.ring strong{align-self:center;font-size:25px}.ring span{align-self:center;font-size:11px;color:#81908b}
        .health>div:last-child span,.forecast>span,.pressure span,.metrics span{display:block;margin-bottom:7px;color:#758680;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.health>div:last-child strong,.pressure>strong{display:block;margin-bottom:7px;color:#17332b;font-size:19px}.health small,.forecast small,.pressure small{color:#72827d;line-height:1.45}.forecast{display:flex;flex-direction:column;justify-content:space-between}.forecast>strong{color:#17332b;font-size:29px}.forecast em{margin-top:14px}
        .pressure>div:first-child{display:flex;justify-content:space-between}.pressure b{font-size:23px;color:#17332b}.track{overflow:hidden;height:8px;margin:11px 0;border-radius:999px;background:#e6eeeb}.track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2dbb90,#efb24b)}
        .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:20px}.metrics article{border:1px solid #e1e8e5;border-radius:17px;padding:19px;background:#fff}.metrics strong{display:block;margin-bottom:6px;color:#17322b;font-size:24px}.metrics small{color:#7a8984}
        .topGrid,.bottomGrid{display:grid;grid-template-columns:1.5fr .9fr;gap:18px;margin-bottom:20px}.panel{padding:21px}.momentum{display:grid;grid-template-columns:repeat(6,1fr);align-items:end;gap:12px;height:205px;padding-top:15px}.momentum div{display:flex;height:100%;flex-direction:column;justify-content:flex-end;align-items:center;gap:7px}.momentum i{width:58%;min-height:10px;border-radius:8px 8px 3px 3px;background:linear-gradient(#31bd91,#1e7d61)}.momentum span{font-size:11px;color:#81908b}
        .brief{display:flex;flex-direction:column}.briefTitle{display:flex;gap:11px;align-items:center;margin-bottom:14px}.briefTitle>b{display:grid;width:40px;height:40px;place-items:center;border-radius:12px;background:#e9f9f3;color:#1d815f}.briefTitle span,.opportunity span{color:#29936f;font-size:11px;font-weight:900;letter-spacing:.08em}.briefTitle h2{margin:4px 0 0;font-size:19px;color:#17322b}.brief p{margin:0 0 9px;padding:11px 13px;border-radius:12px;background:#f6f9f8;color:#586a64}.brief>a{align-self:flex-start;margin-top:auto;border-radius:10px;padding:10px 13px;background:#173d33;color:#fff;font-size:12px;font-weight:800;text-decoration:none}
        .manager{overflow:hidden;margin-bottom:20px}.managerHeader{display:flex;justify-content:space-between;padding:22px 25px;background:linear-gradient(135deg,#fff,#f7fbf9)}.managerHeader h2{margin:5px 0 0;color:#17322b}.managerHeader>b{align-self:flex-start;border-radius:999px;padding:8px 11px;background:#eef7f4;color:#26765f;font-size:12px}.actions{display:grid;gap:10px;border-top:1px solid #edf1ef;padding:17px 25px 23px}.actions article{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:14px;border:1px solid #e3e9e6;border-radius:15px;padding:14px}.actions article.approved{border-color:#bfe4d7;background:#f6fcfa}.actionIcon{display:grid;width:42px;height:42px;place-items:center;border-radius:12px;font-weight:900}.positive .actionIcon{background:#eaf9f4;color:#208364}.warning .actionIcon{background:#fff6e8;color:#b86c20}.urgent .actionIcon{background:#fff0ee;color:#ce493d}.copy h3{margin:0 0 4px;color:#1b302a;font-size:15px}.copy h3 em{border-radius:999px;padding:3px 7px;background:#dff4ec;color:#167657;font-size:10px;font-style:normal}.copy p{margin:0;color:#697974;font-size:13px}.buttons{display:flex;gap:7px}.buttons button,.buttons a{border:1px solid #d7e0dc;border-radius:9px;padding:8px 10px;background:#fff;color:#2c443d;font:inherit;font-size:12px;font-weight:800;text-decoration:none;cursor:pointer}.buttons .approve{border-color:#163f35;background:#163f35;color:#fff}.buttons .dismiss{border:0;color:#7b8985}
        .panelHeading button{border:0;background:transparent;color:#1d765c;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.orderList>div{display:grid;grid-template-columns:.7fr 1.2fr .7fr 1fr .7fr;gap:10px;align-items:center;border-top:1px solid #edf1ef;padding:12px 0}.orderList em{text-transform:capitalize}.empty{display:block!important;color:#72827d}.sellerList{display:grid;gap:12px}.sellerList>div{display:grid;grid-template-columns:24px 1fr 1fr auto;gap:10px;align-items:center}.sellerList>div>span{display:grid;width:23px;height:23px;place-items:center;border-radius:7px;background:#eef7f4;color:#26765f;font-size:11px;font-weight:900}.sellerList i{overflow:hidden;height:7px;border-radius:999px;background:#edf2f0}.sellerList i b{display:block;height:100%;border-radius:inherit;background:#2dbb90}.sellerList small{color:#71817c}
        .opportunity{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:15px;border:1px solid #dbe8e3;border-radius:20px;padding:21px;background:radial-gradient(circle at 88% 15%,rgba(46,190,146,.15),transparent 32%),#f7fbf9}.opportunity>b{display:grid;width:48px;height:48px;place-items:center;border-radius:14px;background:#173d33;color:#fff;font-size:20px}.opportunity h2{margin:5px 0;color:#17322b;font-size:19px}.opportunity p{margin:0;color:#687a74}.opportunity a{border-radius:10px;padding:10px 13px;background:#173d33;color:#fff;font-size:12px;font-weight:800;text-decoration:none}
        @media(max-width:1100px){.heroGrid{grid-template-columns:1fr}.heroGrid article{border-right:0;border-bottom:1px solid #e4ece9}.metrics{grid-template-columns:repeat(2,1fr)}.topGrid,.bottomGrid{grid-template-columns:1fr}.actions article{grid-template-columns:42px 1fr}.buttons{grid-column:2;flex-wrap:wrap}}
        @media(max-width:700px){.heroHeader,.managerHeader{flex-direction:column}.metrics{grid-template-columns:1fr}.actions article{grid-template-columns:1fr}.buttons{grid-column:1}.opportunity{grid-template-columns:1fr}.opportunity a{justify-self:start}}
      `}</style>
    </>
  );
}
