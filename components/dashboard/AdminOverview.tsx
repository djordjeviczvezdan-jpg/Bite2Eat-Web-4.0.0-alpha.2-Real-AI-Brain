"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { MenuItem } from "@/data/menu";
import type { RestaurantOrder } from "@/lib/order-types";
import type { RestaurantSettings } from "@/lib/menu-store";
import { getActiveTenant } from "@/lib/tenant-context";
import { buildRestaurantBrain } from "@/lib/ai";

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

export default function AdminOverview({
  menu,
  orders,
  settings,
  onOpenMenu,
  onOpenSettings
}: Props) {
  const tenant = getActiveTenant();
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({});

  const brain = useMemo(
    () => buildRestaurantBrain({ menu, orders, settings }),
    [menu, orders, settings]
  );

  function actionDestination(target: string) {
    switch (target) {
      case "kitchen":
        return `/r/${tenant}/kitchen`;
      case "inventory":
        return `/r/${tenant}/inventory`;
      case "marketing":
        return `/r/${tenant}/marketing`;
      case "storefront":
        return `/r/${tenant}`;
      default:
        return null;
    }
  }

  function runLocalAction(target: string) {
    if (target === "menu") onOpenMenu();
    if (target === "settings") onOpenSettings();
  }

  const visibleRecommendations = brain.recommendations.filter(
    (recommendation) => actionStates[recommendation.id] !== "dismissed"
  );

  return (
    <>
      <section className="brainHero">
        <div className="brainHeader">
          <div className="brainIdentity">
            <div className="brainLogo">AI</div>
            <div>
              <span className="adminEyebrow">BITE2EAT RESTAURANT BRAIN</span>
              <h2>Your restaurant command center</h2>
              <p>
                Intelligence is now calculated by a reusable AI service layer rather
                than inside the dashboard.
              </p>
            </div>
          </div>
          <div className="brainLive"><i /> Brain online</div>
        </div>

        <div className="brainSummary">
          <article className="healthCard">
            <div
              className="healthRing"
              style={{
                background: `conic-gradient(#28b487 ${brain.health.score * 3.6}deg, #e6efeb 0deg)`
              }}
            >
              <div><strong>{brain.health.score}</strong><span>/100</span></div>
            </div>
            <div>
              <span>Restaurant health</span>
              <strong>{brain.health.label}</strong>
              <small>{brain.health.reasons[0]}</small>
            </div>
          </article>

          <article>
            <span>Predicted closing revenue</span>
            <strong>{euro(brain.forecast.predictedClosingRevenue)}</strong>
            <small>{brain.forecast.confidence}% forecast confidence</small>
          </article>

          <article>
            <span>Kitchen pressure</span>
            <strong>{brain.forecast.kitchenStatus}</strong>
            <div className="pressureTrack">
              <i style={{ width: `${Math.max(5, brain.forecast.kitchenPressure)}%` }} />
            </div>
            <small>{brain.activeOrders} active orders</small>
          </article>
        </div>
      </section>

      <div className="metricGrid">
        <article><span>Revenue</span><strong>{euro(brain.revenue)}</strong><small>{euro(brain.completedRevenue)} completed</small></article>
        <article><span>Total orders</span><strong>{brain.totalOrders}</strong><small>{brain.activeOrders} currently active</small></article>
        <article><span>Average order</span><strong>{euro(brain.averageOrderValue)}</strong><small>AI target opportunity: +10%</small></article>
        <article><span>Menu availability</span><strong>{brain.availableItems}/{menu.length}</strong><small>{brain.unavailableItems ? `${brain.unavailableItems} unavailable` : "Full menu live"}</small></article>
      </div>

      <div className="healthGrid">
        {Object.entries(brain.health.breakdown).map(([label, score]) => (
          <article key={label}>
            <div><span>{label}</span><strong>{score}</strong></div>
            <div className="miniTrack"><i style={{ width: `${score}%` }} /></div>
          </article>
        ))}
      </div>

      <section className="recommendations">
        <div className="sectionHeading">
          <div>
            <span className="adminEyebrow">RECOMMENDATION ENGINE</span>
            <h2>Highest-impact actions</h2>
          </div>
          <b>{visibleRecommendations.length} pending</b>
        </div>

        <div className="recommendationList">
          {visibleRecommendations.map((recommendation) => {
            const state = actionStates[recommendation.id] ?? "pending";
            const href = actionDestination(recommendation.target);

            return (
              <article className={`${recommendation.tone} ${state}`} key={recommendation.id}>
                <div className="recommendationIcon">
                  {recommendation.tone === "urgent"
                    ? "!"
                    : recommendation.tone === "warning"
                      ? "△"
                      : "✓"}
                </div>

                <div className="recommendationCopy">
                  <div>
                    <h3>{recommendation.title}</h3>
                    {state === "approved" && <em>Approved</em>}
                  </div>
                  <p>{recommendation.description}</p>
                  <small>
                    {recommendation.confidence}% confidence · {recommendation.expectedImpact}
                  </small>
                </div>

                <div className="recommendationButtons">
                  {href ? (
                    <Link href={href}>{recommendation.actionLabel}</Link>
                  ) : (
                    <button onClick={() => runLocalAction(recommendation.target)}>
                      {recommendation.actionLabel}
                    </button>
                  )}

                  {state === "pending" && (
                    <button
                      className="approve"
                      onClick={() =>
                        setActionStates((current) => ({
                          ...current,
                          [recommendation.id]: "approved"
                        }))
                      }
                    >
                      Approve
                    </button>
                  )}

                  <button
                    className="dismiss"
                    onClick={() =>
                      setActionStates((current) => ({
                        ...current,
                        [recommendation.id]: "dismissed"
                      }))
                    }
                  >
                    Dismiss
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="operationsGrid">
        <article className="dataPanel">
          <div className="panelHeading">
            <div><span>LIVE OPERATIONS</span><h2>Active orders</h2></div>
            <Link href={`/r/${tenant}/kitchen`}>Kitchen display ↗</Link>
          </div>

          <div className="orderList">
            {orders.filter((order) => order.status !== "completed").length ? (
              orders
                .filter((order) => order.status !== "completed")
                .slice(0, 5)
                .map((order) => (
                  <div key={order.id}>
                    <b>#{order.orderNumber}</b>
                    <span>{order.customer.name}</span>
                    <small>{order.items.reduce((sum, item) => sum + item.quantity, 0)} items</small>
                    <em>{order.status.replaceAll("-", " ")}</em>
                    <strong>{euro(order.total)}</strong>
                  </div>
                ))
            ) : (
              <div className="emptyState">No active orders yet.</div>
            )}
          </div>
        </article>

        <article className="dataPanel">
          <div className="panelHeading">
            <div><span>MENU INTELLIGENCE</span><h2>Best sellers</h2></div>
            <button onClick={onOpenMenu}>Open menu ↗</button>
          </div>

          <div className="sellerList">
            {(brain.topSellers.length
              ? brain.topSellers
              : menu.slice(0, 5).map((item, index) => ({
                  id: item.id,
                  name: item.name,
                  quantity: 12 - index * 2,
                  revenue: (12 - index * 2) * item.price
                }))
            ).map((item, index) => (
              <div key={item.id}>
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
          <span>STRONGEST OPPORTUNITY</span>
          <h2>{brain.strongestOpportunity.title}</h2>
          <p>{brain.strongestOpportunity.description}</p>
        </div>
        <Link href={`/r/${tenant}/marketing`}>Create campaign</Link>
      </article>

      <style jsx>{`
        .brainHero,.recommendations,.dataPanel{border:1px solid #dfe8e4;border-radius:22px;background:#fff;box-shadow:0 16px 42px rgba(20,53,44,.07)}
        .brainHero{overflow:hidden;margin-bottom:20px;background:radial-gradient(circle at 95% 0,rgba(43,188,143,.17),transparent 31%),linear-gradient(140deg,#fff,#f5fbf8)}
        .brainHeader{display:flex;justify-content:space-between;gap:20px;padding:27px}.brainIdentity{display:flex;gap:15px}.brainLogo{display:grid;width:54px;height:54px;place-items:center;border-radius:17px;background:#15382f;color:#fff;font-weight:900}
        .brainIdentity h2{margin:5px 0;color:#17322b;font-size:25px}.brainIdentity p{margin:0;color:#6c7e78}.brainLive{display:flex;align-items:center;gap:8px;align-self:flex-start;border:1px solid #c6e8dc;border-radius:999px;padding:8px 12px;background:#f0faf7;color:#19765a;font-size:12px;font-weight:800}.brainLive i{width:8px;height:8px;border-radius:50%;background:#28b487;box-shadow:0 0 0 5px rgba(40,180,135,.12)}
        .brainSummary{display:grid;grid-template-columns:1.1fr 1fr 1fr;border-top:1px solid #e4ece9}.brainSummary article{min-height:145px;padding:23px;border-right:1px solid #e4ece9}.brainSummary article:last-child{border-right:0}.brainSummary article>span{display:block;margin-bottom:8px;color:#758680;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.brainSummary article>strong{display:block;margin-bottom:8px;color:#17332b;font-size:26px}.brainSummary small{color:#72827d}
        .healthCard{display:flex;align-items:center;gap:18px}.healthRing{display:grid;flex:0 0 90px;width:90px;height:90px;place-items:center;border-radius:50%}.healthRing>div{display:flex;align-items:baseline;justify-content:center;width:68px;height:68px;border-radius:50%;background:#fff}.healthRing strong{align-self:center;font-size:25px}.healthRing span{align-self:center;color:#81908b;font-size:11px}.healthCard>div:last-child span{display:block;margin-bottom:7px;color:#758680;font-size:11px;font-weight:800;text-transform:uppercase}.healthCard>div:last-child strong{display:block;margin-bottom:7px;color:#17332b;font-size:19px}
        .pressureTrack,.miniTrack{overflow:hidden;height:8px;border-radius:999px;background:#e6eeeb}.pressureTrack{margin:12px 0}.pressureTrack i,.miniTrack i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2dbb90,#efb24b)}
        .metricGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:16px}.metricGrid article{border:1px solid #e1e8e5;border-radius:17px;padding:19px;background:#fff}.metricGrid span{display:block;margin-bottom:7px;color:#758680;font-size:11px;font-weight:800;text-transform:uppercase}.metricGrid strong{display:block;margin-bottom:6px;color:#17322b;font-size:24px}.metricGrid small{color:#7a8984}
        .healthGrid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px}.healthGrid article{border:1px solid #e3e9e6;border-radius:14px;padding:14px;background:#fff}.healthGrid article>div:first-child{display:flex;justify-content:space-between;margin-bottom:9px}.healthGrid span{text-transform:capitalize;color:#687a74;font-size:12px;font-weight:800}.healthGrid strong{color:#17322b}
        .recommendations{overflow:hidden;margin-bottom:20px}.sectionHeading{display:flex;justify-content:space-between;padding:22px 25px;background:linear-gradient(135deg,#fff,#f7fbf9)}.sectionHeading h2{margin:5px 0 0;color:#17322b}.sectionHeading>b{align-self:flex-start;border-radius:999px;padding:8px 11px;background:#eef7f4;color:#26765f;font-size:12px}.recommendationList{display:grid;gap:10px;border-top:1px solid #edf1ef;padding:17px 25px 23px}.recommendationList article{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:14px;border:1px solid #e3e9e6;border-radius:15px;padding:14px}.recommendationList article.approved{border-color:#bfe4d7;background:#f6fcfa}.recommendationIcon{display:grid;width:42px;height:42px;place-items:center;border-radius:12px;font-weight:900}.positive .recommendationIcon{background:#eaf9f4;color:#208364}.warning .recommendationIcon{background:#fff6e8;color:#b86c20}.urgent .recommendationIcon{background:#fff0ee;color:#ce493d}.recommendationCopy>div{display:flex;align-items:center;gap:8px}.recommendationCopy h3{margin:0;color:#1b302a;font-size:15px}.recommendationCopy em{border-radius:999px;padding:3px 7px;background:#dff4ec;color:#167657;font-size:10px;font-style:normal}.recommendationCopy p{margin:5px 0;color:#697974;font-size:13px}.recommendationCopy small{color:#88958f}.recommendationButtons{display:flex;gap:7px}.recommendationButtons button,.recommendationButtons a{border:1px solid #d7e0dc;border-radius:9px;padding:8px 10px;background:#fff;color:#2c443d;font:inherit;font-size:12px;font-weight:800;text-decoration:none;cursor:pointer}.recommendationButtons .approve{border-color:#163f35;background:#163f35;color:#fff}.recommendationButtons .dismiss{border:0;color:#7b8985}
        .operationsGrid{display:grid;grid-template-columns:1.35fr 1fr;gap:18px;margin-bottom:20px}.dataPanel{padding:21px}.panelHeading button{border:0;background:transparent;color:#1d765c;font:inherit;font-size:12px;font-weight:800;cursor:pointer}.orderList>div{display:grid;grid-template-columns:.7fr 1.2fr .7fr 1fr .7fr;gap:10px;align-items:center;border-top:1px solid #edf1ef;padding:12px 0}.orderList em{text-transform:capitalize}.emptyState{display:block!important;color:#72827d}.sellerList{display:grid;gap:12px}.sellerList>div{display:grid;grid-template-columns:24px 1fr 1fr auto;gap:10px;align-items:center}.sellerList>div>span{display:grid;width:23px;height:23px;place-items:center;border-radius:7px;background:#eef7f4;color:#26765f;font-size:11px;font-weight:900}.sellerList i{overflow:hidden;height:7px;border-radius:999px;background:#edf2f0}.sellerList i b{display:block;height:100%;border-radius:inherit;background:#2dbb90}.sellerList small{color:#71817c}
        .opportunity{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:15px;border:1px solid #dbe8e3;border-radius:20px;padding:21px;background:radial-gradient(circle at 88% 15%,rgba(46,190,146,.15),transparent 32%),#f7fbf9}.opportunity>b{display:grid;width:48px;height:48px;place-items:center;border-radius:14px;background:#173d33;color:#fff;font-size:20px}.opportunity span{color:#29936f;font-size:11px;font-weight:900;letter-spacing:.08em}.opportunity h2{margin:5px 0;color:#17322b;font-size:19px}.opportunity p{margin:0;color:#687a74}.opportunity a{border-radius:10px;padding:10px 13px;background:#173d33;color:#fff;font-size:12px;font-weight:800;text-decoration:none}
        @media(max-width:1100px){.brainSummary{grid-template-columns:1fr}.brainSummary article{border-right:0;border-bottom:1px solid #e4ece9}.metricGrid{grid-template-columns:repeat(2,1fr)}.healthGrid{grid-template-columns:repeat(2,1fr)}.operationsGrid{grid-template-columns:1fr}.recommendationList article{grid-template-columns:42px 1fr}.recommendationButtons{grid-column:2;flex-wrap:wrap}}
        @media(max-width:700px){.brainHeader,.sectionHeading{flex-direction:column}.metricGrid,.healthGrid{grid-template-columns:1fr}.recommendationList article{grid-template-columns:1fr}.recommendationButtons{grid-column:1}.opportunity{grid-template-columns:1fr}.opportunity a{justify-self:start}}
      `}</style>
    </>
  );
}
