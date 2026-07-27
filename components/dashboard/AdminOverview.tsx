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

type ManagerAction = {
  id: string;
  icon: string;
  tone: "urgent" | "warning" | "positive";
  title: string;
  description: string;
  primaryLabel: string;
  href?: string;
  onClick?: () => void;
};

function euro(value: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR"
  }).format(value);
}

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

export default function AdminOverview({
  menu,
  orders,
  settings,
  onOpenMenu,
  onOpenSettings
}: Props) {
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});

  const tenant = getActiveTenant();
  const liveOrders = orders.filter((order) => order.status !== "completed");
  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const averageOrder = orders.length ? revenue / orders.length : 0;
  const availableItems = menu.filter((item) => item.available !== false).length;
  const unavailableItems = menu.length - availableItems;

  const itemSales = useMemo(() => {
    const counts = new Map<number, { name: string; quantity: number }>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const current = counts.get(item.id) ?? { name: item.name, quantity: 0 };
        counts.set(item.id, {
          name: current.name,
          quantity: current.quantity + item.quantity
        });
      });
    });
    return [...counts.values()].sort((a, b) => b.quantity - a.quantity);
  }, [orders]);

  const actions = useMemo<ManagerAction[]>(() => {
    const next: ManagerAction[] = [];

    if (!settings.acceptingOrders) {
      next.push({
        id: "ordering-paused",
        icon: "!",
        tone: "urgent",
        title: "Online ordering is paused",
        description: "Customers cannot place new orders until ordering is reopened.",
        primaryLabel: "Review settings",
        onClick: onOpenSettings
      });
    } else if (liveOrders.length > 0) {
      next.push({
        id: "active-orders",
        icon: "↗",
        tone: "positive",
        title: `${liveOrders.length} active order${liveOrders.length === 1 ? "" : "s"} in progress`,
        description: "Review preparation times and keep kitchen statuses current.",
        primaryLabel: "Open kitchen",
        href: `/r/${tenant}/kitchen`
      });
    } else {
      next.push({
        id: "ready",
        icon: "✓",
        tone: "positive",
        title: "Restaurant is ready for new orders",
        description: "Ordering is open and there are no active orders requiring attention.",
        primaryLabel: "View storefront",
        href: `/r/${tenant}`
      });
    }

    if (unavailableItems > 0) {
      next.push({
        id: "menu-availability",
        icon: "!",
        tone: "warning",
        title: `${unavailableItems} menu item${unavailableItems === 1 ? " is" : "s are"} unavailable`,
        description: "Review sold-out products and restore anything that is ready to sell.",
        primaryLabel: "Review menu",
        onClick: onOpenMenu
      });
    } else {
      next.push({
        id: "menu-ready",
        icon: "✓",
        tone: "positive",
        title: "Full menu availability",
        description: `${availableItems} menu items are currently available to customers.`,
        primaryLabel: "Optimise menu",
        onClick: onOpenMenu
      });
    }

    if (!settings.inventoryEnabled) {
      next.push({
        id: "inventory-disabled",
        icon: "□",
        tone: "warning",
        title: "Enable inventory intelligence",
        description: "Inventory data unlocks shortage alerts, waste insights and purchase-order recommendations.",
        primaryLabel: "Enable inventory",
        onClick: onOpenSettings
      });
    } else {
      next.push({
        id: "inventory-review",
        icon: "□",
        tone: "positive",
        title: "Review stock before the next rush",
        description: "Inventory tracking is enabled. Check low-stock ingredients and supplier risks.",
        primaryLabel: "Open inventory",
        href: `/r/${tenant}/inventory`
      });
    }

    next.push({
      id: "marketing",
      icon: "✦",
      tone: "positive",
      title: "Create a revenue campaign",
      description: orders.length
        ? `Average order value is ${euro(averageOrder)}. Promote a side or drink add-on.`
        : "Prepare a first-order campaign to generate customer activity.",
      primaryLabel: "Open marketing",
      href: `/r/${tenant}/marketing`
    });

    return next.slice(0, 3);
  }, [
    settings.acceptingOrders,
    settings.inventoryEnabled,
    liveOrders.length,
    unavailableItems,
    availableItems,
    orders.length,
    averageOrder,
    onOpenMenu,
    onOpenSettings,
    tenant
  ]);

  const visibleActions = actions.filter(
    (action) => actionStates[action.id] !== "dismissed"
  );

  const healthScore = Math.max(
    45,
    Math.min(
      100,
      68 +
        (settings.acceptingOrders ? 8 : -12) +
        (unavailableItems === 0 ? 8 : -Math.min(12, unavailableItems * 2)) +
        (settings.inventoryEnabled ? 8 : 0) +
        (liveOrders.length > 0 ? 4 : 0)
    )
  );

  return (
    <>
      <section className="aiManagerPanel">
        <div className="aiManagerHeader">
          <div className="aiManagerIdentity">
            <div className="aiManagerLogo">AI</div>
            <div>
              <span className="adminEyebrow">AI RESTAURANT MANAGER</span>
              <h2>Here is what needs your attention today</h2>
              <p>
                Bite2Eat reviewed live orders, menu availability and your restaurant settings.
              </p>
            </div>
          </div>
          <div className="aiManagerStatus">
            <span className="aiStatusDot" />
            AI monitoring active
          </div>
        </div>

        <div className="aiManagerSummary">
          <article>
            <span>Pending actions</span>
            <strong>
              {actions.filter(
                (action) => (actionStates[action.id] ?? "pending") === "pending"
              ).length}
            </strong>
          </article>
          <article>
            <span>Active orders</span>
            <strong>{liveOrders.length}</strong>
          </article>
          <article>
            <span>Menu availability</span>
            <strong>{availableItems}/{menu.length}</strong>
          </article>
          <article>
            <span>Restaurant health</span>
            <strong className={healthScore >= 80 ? "positive" : "warning"}>
              {healthScore}/100
            </strong>
          </article>
        </div>

        <div className="aiActionList">
          {visibleActions.map((action) => {
            const status = actionStates[action.id] ?? "pending";
            return (
              <article
                className={`aiActionCard ${action.tone} ${
                  status === "approved" ? "approved" : ""
                }`}
                key={action.id}
              >
                <div className="aiActionIcon">{action.icon}</div>
                <div className="aiActionCopy">
                  <div className="aiActionTitleRow">
                    <h3>{action.title}</h3>
                    {status === "approved" && (
                      <span className="aiApprovedBadge">Approved</span>
                    )}
                  </div>
                  <p>{action.description}</p>
                </div>
                <div className="aiActionButtons">
                  {action.href ? (
                    <Link className="aiReviewButton" href={action.href}>
                      {action.primaryLabel}
                    </Link>
                  ) : (
                    <button className="aiReviewButton" onClick={action.onClick}>
                      {action.primaryLabel}
                    </button>
                  )}
                  {status === "pending" && (
                    <button
                      className="aiApproveButton"
                      onClick={() =>
                        setActionStates((current) => ({
                          ...current,
                          [action.id]: "approved"
                        }))
                      }
                    >
                      Approve draft
                    </button>
                  )}
                  <button
                    className="aiDismissButton"
                    onClick={() =>
                      setActionStates((current) => ({
                        ...current,
                        [action.id]: "dismissed"
                      }))
                    }
                  >
                    Dismiss
                  </button>
                </div>
              </article>
            );
          })}

          {visibleActions.length === 0 && (
            <div className="aiAllClear">
              <strong>All caught up</strong>
              <span>You have reviewed every AI recommendation.</span>
            </div>
          )}
        </div>

        <div className="aiManagerFooter">
          <span>
            Draft approval is for review only. Bite2Eat will not make business changes automatically.
          </span>
          <Link href={`/r/${tenant}/coach`}>Ask AI Restaurant Coach →</Link>
        </div>
      </section>

      <div className="adminMetrics">
        <article>
          <span>Revenue</span>
          <strong>{euro(revenue)}</strong>
          <small>From all recorded orders</small>
        </article>
        <article>
          <span>Total orders</span>
          <strong>{orders.length}</strong>
          <small>{liveOrders.length} currently active</small>
        </article>
        <article>
          <span>Average order</span>
          <strong>{euro(averageOrder)}</strong>
          <small>Across all orders</small>
        </article>
        <article>
          <span>Menu availability</span>
          <strong>{availableItems}/{menu.length}</strong>
          <small>Items available</small>
        </article>
      </div>

      <div className="adminOverviewGrid">
        <article className="adminPanel">
          <div className="panelHeading">
            <div><span>LIVE OPERATIONS</span><h2>Active orders</h2></div>
            <Link href={`/r/${tenant}/kitchen`}>Kitchen display ↗</Link>
          </div>
          <div className="overviewOrders">
            {liveOrders.length === 0 ? (
              <div className="adminEmpty">No active orders yet.</div>
            ) : (
              liveOrders.slice(0, 5).map((order) => (
                <div key={order.id}>
                  <b>#{order.orderNumber}</b>
                  <span>{order.customer.name}</span>
                  <small>
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                  </small>
                  <span className={`paymentStatusPill ${paymentClass(order)}`}>
                    {paymentLabel(order)}
                  </span>
                  <em>{order.status.replaceAll("-", " ")}</em>
                  <strong>{euro(order.total)}</strong>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="adminPanel">
          <div className="panelHeading">
            <div><span>MENU INTELLIGENCE</span><h2>Best sellers</h2></div>
          </div>
          <div className="bestSellerList">
            {(itemSales.length
              ? itemSales
              : menu.slice(0, 5).map((item, index) => ({
                  name: item.name,
                  quantity: 12 - index * 2
                }))
            )
              .slice(0, 5)
              .map((item, index) => (
                <div key={item.name}>
                  <span>{index + 1}</span>
                  <strong>{item.name}</strong>
                  <div>
                    <i style={{ width: `${Math.max(18, 100 - index * 17)}%` }} />
                  </div>
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
          <p>
            Customers ordering burgers frequently add a drink but skip a side.
            Offer Loaded Garlic Fries as a one-click recommendation to increase average order value.
          </p>
        </div>
        <button onClick={onOpenMenu}>Review menu</button>
      </article>

      <style jsx>{`
        .aiManagerPanel {
          overflow: hidden;
          margin-bottom: 24px;
          border: 1px solid #dfe7e4;
          border-radius: 22px;
          background:
            radial-gradient(circle at top right, rgba(41, 186, 140, 0.12), transparent 34%),
            #fff;
          box-shadow: 0 18px 45px rgba(22, 52, 44, 0.08);
        }
        .aiManagerHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          padding: 26px 28px 22px;
        }
        .aiManagerIdentity {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .aiManagerLogo {
          display: grid;
          flex: 0 0 52px;
          width: 52px;
          height: 52px;
          place-items: center;
          border-radius: 16px;
          background: #132f29;
          color: #fff;
          font-weight: 800;
          box-shadow: 0 10px 24px rgba(19, 47, 41, 0.2);
        }
        .aiManagerIdentity h2 {
          margin: 5px 0 6px;
          color: #172b26;
          font-size: 24px;
        }
        .aiManagerIdentity p {
          max-width: 720px;
          margin: 0;
          color: #667772;
          line-height: 1.55;
        }
        .aiManagerStatus {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
          border: 1px solid #cbe9df;
          border-radius: 999px;
          padding: 9px 13px;
          background: #f2fbf8;
          color: #19775c;
          font-size: 13px;
          font-weight: 700;
        }
        .aiStatusDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #28b487;
          box-shadow: 0 0 0 5px rgba(40, 180, 135, 0.12);
        }
        .aiManagerSummary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          border-top: 1px solid #edf1ef;
          border-bottom: 1px solid #edf1ef;
          background: rgba(248, 251, 250, 0.82);
        }
        .aiManagerSummary article {
          padding: 18px 24px;
          border-right: 1px solid #e8eeeb;
        }
        .aiManagerSummary article:last-child { border-right: 0; }
        .aiManagerSummary span {
          display: block;
          margin-bottom: 7px;
          color: #74847f;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .aiManagerSummary strong {
          color: #172b26;
          font-size: 23px;
        }
        .aiManagerSummary strong.positive { color: #178360; }
        .aiManagerSummary strong.warning { color: #b76821; }
        .aiActionList {
          display: grid;
          gap: 12px;
          padding: 20px 28px;
        }
        .aiActionCard {
          display: grid;
          grid-template-columns: 42px minmax(0, 1fr) auto;
          align-items: center;
          gap: 15px;
          border: 1px solid #e3e9e6;
          border-radius: 16px;
          padding: 16px;
          background: #fff;
        }
        .aiActionCard.approved {
          border-color: #bfe4d7;
          background: #f6fcfa;
        }
        .aiActionIcon {
          display: grid;
          width: 42px;
          height: 42px;
          place-items: center;
          border-radius: 13px;
          font-size: 18px;
          font-weight: 900;
        }
        .aiActionCard.urgent .aiActionIcon {
          background: #fff0ee;
          color: #ce493d;
        }
        .aiActionCard.warning .aiActionIcon {
          background: #fff6e8;
          color: #b86c20;
        }
        .aiActionCard.positive .aiActionIcon {
          background: #eaf9f4;
          color: #208364;
        }
        .aiActionCopy { min-width: 0; }
        .aiActionTitleRow {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .aiActionCopy h3 {
          margin: 0 0 5px;
          color: #1b302a;
          font-size: 15px;
        }
        .aiActionCopy p {
          margin: 0;
          color: #697974;
          font-size: 13px;
          line-height: 1.5;
        }
        .aiApprovedBadge {
          border-radius: 999px;
          padding: 4px 8px;
          background: #dff4ec;
          color: #167657;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }
        .aiActionButtons {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
        }
        .aiActionButtons button,
        .aiReviewButton {
          border-radius: 10px;
          padding: 9px 12px;
          font: inherit;
          font-size: 12px;
          font-weight: 750;
          text-decoration: none;
          cursor: pointer;
        }
        .aiReviewButton {
          border: 1px solid #d7e0dc;
          background: #fff;
          color: #2c443d;
        }
        .aiApproveButton {
          border: 1px solid #163f35;
          background: #163f35;
          color: #fff;
        }
        .aiDismissButton {
          border: 0;
          background: transparent;
          color: #7b8985;
        }
        .aiManagerFooter {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-top: 1px solid #edf1ef;
          padding: 15px 28px;
          background: #fafcfb;
          color: #788682;
          font-size: 12px;
        }
        .aiManagerFooter a {
          color: #176d55;
          font-weight: 800;
          text-decoration: none;
        }
        .aiAllClear {
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px dashed #cbd9d4;
          border-radius: 16px;
          padding: 28px;
          color: #687974;
        }
        .aiAllClear strong {
          margin-bottom: 4px;
          color: #1b3d34;
          font-size: 17px;
        }
        @media (max-width: 1100px) {
          .aiManagerSummary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .aiActionCard {
            grid-template-columns: 42px minmax(0, 1fr);
          }
          .aiActionButtons {
            grid-column: 2;
            justify-content: flex-start;
            flex-wrap: wrap;
          }
        }
        @media (max-width: 720px) {
          .aiManagerHeader,
          .aiManagerFooter {
            align-items: flex-start;
            flex-direction: column;
          }
          .aiManagerSummary { grid-template-columns: 1fr; }
          .aiManagerSummary article {
            border-right: 0;
            border-bottom: 1px solid #e8eeeb;
          }
          .aiActionList { padding: 16px; }
          .aiActionCard { grid-template-columns: 1fr; }
          .aiActionIcon,
          .aiActionButtons { grid-column: 1; }
          .aiManagerHeader { padding: 22px 18px; }
          .aiManagerFooter { padding: 15px 18px; }
        }
      `}</style>
    </>
  );
}
