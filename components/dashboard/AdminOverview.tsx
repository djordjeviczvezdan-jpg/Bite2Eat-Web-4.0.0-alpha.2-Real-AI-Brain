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

function formatTrend(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
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

  const chartMetrics = brain.forecast.hourly.filter(
    (_, index, metrics) =>
      metrics.length <= 10 || index % Math.ceil(metrics.length / 10) === 0
  );

  const maxChartValue = Math.max(
    1,
    ...chartMetrics.map((metric) =>
      Math.max(metric.actualRevenue, metric.forecastRevenue)
    )
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
      <section className="forecastHero">
        <div className="heroTop">
          <div>
            <span className="eyebrow">PREDICTIVE INTELLIGENCE</span>
            <h1>Today’s forecast</h1>
            <p>
              Bite2Eat is projecting demand, revenue and kitchen pressure from
              current trading velocity and historical order patterns.
            </p>
          </div>

          <div className="confidence">
            <div>
              <strong>{brain.forecast.confidence}%</strong>
              <span>{brain.forecast.confidenceLabel} confidence</span>
            </div>
            <i>
              <b style={{ width: `${brain.forecast.confidence}%` }} />
            </i>
          </div>
        </div>

        <div className="forecastGrid">
          <article>
            <span>Predicted closing revenue</span>
            <strong>{euro(brain.forecast.predictedClosingRevenue)}</strong>
            <small>
              {brain.forecast.variancePercent >= 0 ? "▲" : "▼"}{" "}
              {Math.abs(brain.forecast.variancePercent).toFixed(0)}% versus
              forecast pace
            </small>
          </article>

          <article>
            <span>Expected orders</span>
            <strong>{brain.forecast.predictedOrders}</strong>
            <small>{brain.totalOrders} recorded so far</small>
          </article>

          <article>
            <span>Kitchen pressure</span>
            <strong>{brain.forecast.kitchenStatus}</strong>
            <div className="pressureTrack">
              <i style={{ width: `${Math.max(5, brain.forecast.kitchenPressure)}%` }} />
            </div>
            <small>{brain.forecast.kitchenPressure}% predicted pressure</small>
          </article>

          <article className="healthMini">
            <div
              className="healthRing"
              style={{
                background: `conic-gradient(#28b487 ${brain.health.score * 3.6}deg, #e5eeea 0deg)`
              }}
            >
              <div><strong>{brain.health.score}</strong></div>
            </div>
            <div>
              <span>Restaurant health</span>
              <strong>{brain.health.label}</strong>
              <small>{brain.health.reasons[0]}</small>
            </div>
          </article>
        </div>
      </section>

      <div className="mainGrid">
        <section className="chartPanel">
          <div className="panelHeading">
            <div>
              <span>FORECAST VS ACTUAL</span>
              <h2>Hourly revenue projection</h2>
            </div>
            <div className="legend">
              <span><i className="actualDot" /> Actual</span>
              <span><i className="forecastDot" /> Forecast</span>
            </div>
          </div>

          <div className="chart">
            {chartMetrics.map((metric) => (
              <div className="chartColumn" key={metric.hour}>
                <div className="bars">
                  <i
                    className="actualBar"
                    style={{
                      height: `${Math.max(2, (metric.actualRevenue / maxChartValue) * 100)}%`
                    }}
                    title={`Actual ${euro(metric.actualRevenue)}`}
                  />
                  <i
                    className="forecastBar"
                    style={{
                      height: `${Math.max(3, (metric.forecastRevenue / maxChartValue) * 100)}%`
                    }}
                    title={`Forecast ${euro(metric.forecastRevenue)}`}
                  />
                </div>
                <span>{metric.label.replace(":00", "")}</span>
              </div>
            ))}
          </div>

          <div className="forecastReasons">
            {brain.forecast.reasons.map((reason) => (
              <div key={reason.label} className={reason.impact}>
                <i />
                <span>{reason.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="timelinePanel">
          <div className="panelHeading">
            <div>
              <span>AI EVENT STREAM</span>
              <h2>Operational timeline</h2>
            </div>
            <b>Live</b>
          </div>

          <div className="timeline">
            {brain.timeline.map((event) => (
              <article key={event.id} className={event.tone}>
                <time>{event.time}</time>
                <i />
                <div>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  {event.isForecast && <small>Forecast event</small>}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <div className="trendGrid">
        {Object.values(brain.trends).map((trend) => (
          <article key={trend.label}>
            <div>
              <span>{trend.label}</span>
              <b className={trend.direction}>{formatTrend(trend.value)}</b>
            </div>
            <strong>
              {trend.direction === "up" ? "Improving" : trend.direction === "down" ? "Declining" : "Stable"}
            </strong>
            <small>{trend.explanation}</small>
          </article>
        ))}
      </div>

      <section className="recommendations">
        <div className="panelHeading recommendationHeading">
          <div>
            <span>RECOMMENDATION ENGINE</span>
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
                    <small>
                      {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                    </small>
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
        .forecastHero,.chartPanel,.timelinePanel,.recommendations,.dataPanel{border:1px solid #dfe8e4;border-radius:22px;background:#fff;box-shadow:0 16px 42px rgba(20,53,44,.07)}
        .forecastHero{overflow:hidden;margin-bottom:20px;background:radial-gradient(circle at 92% 5%,rgba(43,188,143,.18),transparent 31%),linear-gradient(140deg,#fff,#f5fbf8)}
        .heroTop{display:flex;justify-content:space-between;gap:25px;padding:28px}.eyebrow,.panelHeading span,.opportunity span{color:#27866a;font-size:11px;font-weight:900;letter-spacing:.09em}.heroTop h1{margin:6px 0 8px;color:#17322b;font-size:30px}.heroTop p{max-width:720px;margin:0;color:#687a74;line-height:1.6}
        .confidence{min-width:205px;border:1px solid #d9e8e2;border-radius:17px;padding:15px;background:rgba(255,255,255,.72)}.confidence>div{display:flex;justify-content:space-between;align-items:baseline;gap:10px}.confidence strong{color:#17382f;font-size:24px}.confidence span{color:#70817b;font-size:11px;font-weight:800}.confidence>i{display:block;overflow:hidden;height:8px;margin-top:11px;border-radius:999px;background:#e8efec}.confidence>i b{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2dbb90,#6bcf75)}
        .forecastGrid{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #e4ece9}.forecastGrid article{min-height:145px;padding:22px;border-right:1px solid #e4ece9}.forecastGrid article:last-child{border-right:0}.forecastGrid article>span{display:block;margin-bottom:9px;color:#758680;font-size:11px;font-weight:800;text-transform:uppercase}.forecastGrid article>strong{display:block;margin-bottom:8px;color:#17332b;font-size:27px}.forecastGrid small{color:#72827d}.pressureTrack{overflow:hidden;height:8px;margin:13px 0;border-radius:999px;background:#e6eeeb}.pressureTrack i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#2dbb90,#efb24b,#e8665b)}
        .healthMini{display:flex;align-items:center;gap:15px}.healthRing{display:grid;flex:0 0 76px;width:76px;height:76px;place-items:center;border-radius:50%}.healthRing>div{display:grid;width:57px;height:57px;place-items:center;border-radius:50%;background:#fff}.healthRing strong{color:#17382f;font-size:22px}.healthMini>div:last-child>span{display:block;color:#758680;font-size:11px;font-weight:800;text-transform:uppercase}.healthMini>div:last-child>strong{display:block;margin:6px 0;color:#17332b;font-size:18px}
        .mainGrid{display:grid;grid-template-columns:1.45fr .75fr;gap:18px;margin-bottom:18px}.chartPanel,.timelinePanel,.dataPanel{padding:22px}.panelHeading{display:flex;justify-content:space-between;align-items:flex-start;gap:15px}.panelHeading h2{margin:5px 0 0;color:#17322b;font-size:20px}.panelHeading>a,.panelHeading button{border:0;background:transparent;color:#1d765c;font:inherit;font-size:12px;font-weight:800;text-decoration:none;cursor:pointer}.panelHeading>b{border-radius:999px;padding:7px 10px;background:#eaf8f3;color:#228061;font-size:11px}
        .legend{display:flex;gap:12px;color:#73817d;font-size:11px}.legend span{display:flex;align-items:center;gap:5px}.legend i{width:8px;height:8px;border-radius:50%}.actualDot{background:#183b32}.forecastDot{background:#6fd0ad}
        .chart{display:flex;height:235px;align-items:flex-end;gap:12px;margin:26px 0 17px;border-bottom:1px solid #dfe8e4;padding:0 4px}.chartColumn{display:flex;flex:1;height:100%;flex-direction:column;justify-content:flex-end;align-items:center;gap:8px}.bars{display:flex;width:100%;height:190px;align-items:flex-end;justify-content:center;gap:3px}.bars i{display:block;width:34%;min-width:5px;border-radius:5px 5px 0 0}.actualBar{background:#183b32}.forecastBar{background:#6fd0ad;opacity:.75}.chartColumn>span{color:#7a8984;font-size:10px;white-space:nowrap}
        .forecastReasons{display:grid;gap:7px}.forecastReasons>div{display:flex;align-items:center;gap:8px;color:#64756f;font-size:12px}.forecastReasons i{width:7px;height:7px;border-radius:50%;background:#aab5b1}.forecastReasons .positive i{background:#2dbb90}.forecastReasons .negative i{background:#e86b5c}
        .timeline{display:grid;margin-top:19px}.timeline article{display:grid;grid-template-columns:58px 13px 1fr;gap:10px;min-height:82px}.timeline time{padding-top:1px;color:#64756f;font-size:11px;font-weight:800}.timeline article>i{position:relative;width:11px;height:11px;border:3px solid #fff;border-radius:50%;background:#6c8d82;box-shadow:0 0 0 1px #b8c9c3}.timeline article>i:after{position:absolute;top:10px;left:3px;width:1px;height:64px;background:#dce6e2;content:""}.timeline article:last-child>i:after{display:none}.timeline .positive>i{background:#2dbb90}.timeline .warning>i{background:#e6a340}.timeline .urgent>i{background:#df5b50}.timeline h3{margin:0;color:#1c352e;font-size:13px}.timeline p{margin:4px 0;color:#6d7d77;font-size:12px;line-height:1.45}.timeline small{color:#2a8c6d;font-size:10px;font-weight:800;text-transform:uppercase}
        .trendGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.trendGrid article{border:1px solid #e0e8e5;border-radius:16px;padding:17px;background:#fff}.trendGrid article>div{display:flex;justify-content:space-between;gap:10px}.trendGrid span{color:#71817b;font-size:11px;font-weight:800;text-transform:uppercase}.trendGrid b{font-size:12px}.trendGrid b.up{color:#1c8a67}.trendGrid b.down{color:#cf5149}.trendGrid b.stable{color:#8a7a52}.trendGrid strong{display:block;margin:12px 0 5px;color:#17322b;font-size:18px}.trendGrid small{color:#7a8984;line-height:1.4}
        .recommendations{overflow:hidden;margin-bottom:18px}.recommendationHeading{padding:21px 24px;background:linear-gradient(135deg,#fff,#f7fbf9)}.recommendationList{display:grid;gap:10px;border-top:1px solid #edf1ef;padding:17px 24px 23px}.recommendationList article{display:grid;grid-template-columns:42px 1fr auto;align-items:center;gap:14px;border:1px solid #e3e9e6;border-radius:15px;padding:14px}.recommendationList article.approved{border-color:#bfe4d7;background:#f6fcfa}.recommendationIcon{display:grid;width:42px;height:42px;place-items:center;border-radius:12px;font-weight:900}.positive .recommendationIcon{background:#eaf9f4;color:#208364}.warning .recommendationIcon{background:#fff6e8;color:#b86c20}.urgent .recommendationIcon{background:#fff0ee;color:#ce493d}.recommendationCopy>div{display:flex;align-items:center;gap:8px}.recommendationCopy h3{margin:0;color:#1b302a;font-size:15px}.recommendationCopy em{border-radius:999px;padding:3px 7px;background:#dff4ec;color:#167657;font-size:10px;font-style:normal}.recommendationCopy p{margin:5px 0;color:#697974;font-size:13px}.recommendationCopy small{color:#88958f}.recommendationButtons{display:flex;gap:7px}.recommendationButtons button,.recommendationButtons a{border:1px solid #d7e0dc;border-radius:9px;padding:8px 10px;background:#fff;color:#2c443d;font:inherit;font-size:12px;font-weight:800;text-decoration:none;cursor:pointer}.recommendationButtons .approve{border-color:#163f35;background:#163f35;color:#fff}.recommendationButtons .dismiss{border:0;color:#7b8985}
        .operationsGrid{display:grid;grid-template-columns:1.35fr 1fr;gap:18px;margin-bottom:18px}.orderList>div{display:grid;grid-template-columns:.7fr 1.2fr .7fr 1fr .7fr;gap:10px;align-items:center;border-top:1px solid #edf1ef;padding:12px 0}.orderList em{text-transform:capitalize}.emptyState{display:block!important;color:#72827d}.sellerList{display:grid;gap:12px;margin-top:18px}.sellerList>div{display:grid;grid-template-columns:24px 1fr 1fr auto;gap:10px;align-items:center}.sellerList>div>span{display:grid;width:23px;height:23px;place-items:center;border-radius:7px;background:#eef7f4;color:#26765f;font-size:11px;font-weight:900}.sellerList i{overflow:hidden;height:7px;border-radius:999px;background:#edf2f0}.sellerList i b{display:block;height:100%;border-radius:inherit;background:#2dbb90}.sellerList small{color:#71817c}
        .opportunity{display:grid;grid-template-columns:48px 1fr auto;align-items:center;gap:15px;border:1px solid #dbe8e3;border-radius:20px;padding:21px;background:radial-gradient(circle at 88% 15%,rgba(46,190,146,.15),transparent 32%),#f7fbf9}.opportunity>b{display:grid;width:48px;height:48px;place-items:center;border-radius:14px;background:#173d33;color:#fff;font-size:20px}.opportunity h2{margin:5px 0;color:#17322b;font-size:19px}.opportunity p{margin:0;color:#687a74}.opportunity a{border-radius:10px;padding:10px 13px;background:#173d33;color:#fff;font-size:12px;font-weight:800;text-decoration:none}
        @media(max-width:1150px){.forecastGrid{grid-template-columns:repeat(2,1fr)}.forecastGrid article:nth-child(2){border-right:0}.forecastGrid article{border-bottom:1px solid #e4ece9}.mainGrid,.operationsGrid{grid-template-columns:1fr}.trendGrid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:800px){.heroTop{flex-direction:column}.confidence{min-width:0}.forecastGrid,.trendGrid{grid-template-columns:1fr}.forecastGrid article{border-right:0}.recommendationList article{grid-template-columns:42px 1fr}.recommendationButtons{grid-column:2;flex-wrap:wrap}.chart{gap:5px}.chartColumn>span{font-size:8px}}
        @media(max-width:560px){.recommendationList article{grid-template-columns:1fr}.recommendationButtons{grid-column:1}.opportunity{grid-template-columns:1fr}.opportunity a{justify-self:start}.orderList>div{grid-template-columns:1fr 1fr}.sellerList>div{grid-template-columns:24px 1fr}.sellerList i,.sellerList small{grid-column:2}}
      `}</style>
    </>
  );
}
