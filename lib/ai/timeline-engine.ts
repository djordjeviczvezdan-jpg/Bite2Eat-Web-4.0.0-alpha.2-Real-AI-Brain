import type {
  BusinessData,
  RestaurantForecast,
  TimelineEvent
} from "./types";

function timeLabel(hour: number) {
  return new Intl.DateTimeFormat("en-IE", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true
  }).format(new Date(2026, 0, 1, hour, 0));
}

export function buildTimeline(
  data: BusinessData,
  forecast: RestaurantForecast
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "opening",
      time: timeLabel(data.openingHour),
      title: data.acceptingOrders ? "Restaurant open" : "Ordering currently paused",
      description: data.acceptingOrders
        ? "Online ordering is enabled."
        : "Review settings before the next demand period.",
      tone: data.acceptingOrders ? "positive" : "urgent",
      isForecast: false
    }
  ];

  forecast.peakWindows.forEach((window, index) => {
    events.push({
      id: `peak-${index}`,
      time: timeLabel(window.startHour),
      title: `${index === 0 ? "Primary" : "Secondary"} demand peak`,
      description: `${window.expectedOrders} orders and about €${window.expectedRevenue.toFixed(0)} revenue expected during ${window.label}.`,
      tone: window.pressure >= 75 ? "warning" : "info",
      isForecast: window.startHour > data.currentHour
    });
  });

  if (forecast.variancePercent >= 8) {
    events.push({
      id: "ahead-of-forecast",
      time: timeLabel(data.currentHour),
      title: "Revenue ahead of forecast",
      description: `Trading is running ${forecast.variancePercent.toFixed(0)}% above the expected pace.`,
      tone: "positive",
      isForecast: false
    });
  }

  if (forecast.kitchenPressure >= 70) {
    events.push({
      id: "pressure",
      time: timeLabel(data.currentHour),
      title: "Kitchen pressure alert",
      description: "Active demand and the next peak period may push workload above the preferred range.",
      tone: "warning",
      isForecast: forecast.peakWindows.some(
        (window) => window.startHour > data.currentHour
      )
    });
  }

  events.push({
    id: "closing",
    time: timeLabel(data.closingHour),
    title: "Projected close",
    description: `Forecast: €${forecast.predictedClosingRevenue.toFixed(0)} revenue from approximately ${forecast.predictedOrders} orders.`,
    tone: "info",
    isForecast: true
  });

  return events.sort((a, b) => {
    const convert = (time: string) => {
      const match = time.match(/(\d+):(\d+)\s?(AM|PM)/i);
      if (!match) return 0;
      let hour = Number(match[1]) % 12;
      if (match[3].toUpperCase() === "PM") hour += 12;
      return hour * 60 + Number(match[2]);
    };
    return convert(a.time) - convert(b.time);
  });
}
