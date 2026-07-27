import type { MenuItem } from "@/data/menu";
import type { RestaurantOrder } from "@/lib/order-types";
import type { RestaurantSettings } from "@/lib/menu-store";

export type BrainInput = {
  menu: MenuItem[];
  orders: RestaurantOrder[];
  settings: RestaurantSettings;
  now?: Date;
};

export type HealthArea =
  | "operations"
  | "menu"
  | "inventory"
  | "finance"
  | "marketing";

export type HealthBreakdown = Record<HealthArea, number>;

export type RestaurantHealth = {
  score: number;
  label: "Excellent" | "Healthy" | "Needs attention";
  breakdown: HealthBreakdown;
  reasons: string[];
};

export type RecommendationTone = "urgent" | "warning" | "positive";
export type RecommendationTarget =
  | "kitchen"
  | "menu"
  | "settings"
  | "inventory"
  | "marketing"
  | "storefront";

export type BrainRecommendation = {
  id: string;
  tone: RecommendationTone;
  target: RecommendationTarget;
  title: string;
  description: string;
  actionLabel: string;
  confidence: number;
  expectedImpact: string;
};

export type HourlyMetric = {
  hour: number;
  label: string;
  actualRevenue: number;
  forecastRevenue: number;
  actualOrders: number;
  forecastOrders: number;
};

export type PeakWindow = {
  startHour: number;
  endHour: number;
  label: string;
  expectedOrders: number;
  expectedRevenue: number;
  pressure: number;
};

export type TrendDirection = "up" | "down" | "stable";

export type TrendMetric = {
  label: string;
  value: number;
  unit: "percent" | "currency" | "count";
  direction: TrendDirection;
  explanation: string;
};

export type RestaurantTrends = {
  revenue: TrendMetric;
  orders: TrendMetric;
  averageOrderValue: TrendMetric;
  repeatDemand: TrendMetric;
};

export type ForecastReason = {
  label: string;
  impact: "positive" | "negative" | "neutral";
};

export type RestaurantForecast = {
  predictedClosingRevenue: number;
  predictedOrders: number;
  forecastRevenueToNow: number;
  actualRevenueToNow: number;
  variancePercent: number;
  confidence: number;
  confidenceLabel: "High" | "Moderate" | "Early estimate";
  kitchenPressure: number;
  kitchenStatus: "Under control" | "Busy" | "High pressure";
  peakWindows: PeakWindow[];
  hourly: HourlyMetric[];
  reasons: ForecastReason[];
};

export type TimelineEventTone = "info" | "positive" | "warning" | "urgent";

export type TimelineEvent = {
  id: string;
  time: string;
  title: string;
  description: string;
  tone: TimelineEventTone;
  isForecast: boolean;
};

export type TopSeller = {
  id: number;
  name: string;
  quantity: number;
  revenue: number;
};

export type NormalizedOrder = {
  id: string;
  orderNumber: string | number;
  timestamp: Date;
  hour: number;
  weekday: number;
  total: number;
  status: string;
  itemCount: number;
  customerKey: string;
};

export type BusinessData = {
  now: Date;
  currentHour: number;
  weekday: number;
  openingHour: number;
  closingHour: number;
  orders: NormalizedOrder[];
  todaysOrders: NormalizedOrder[];
  historicalOrders: NormalizedOrder[];
  completedOrders: NormalizedOrder[];
  activeOrders: NormalizedOrder[];
  revenue: number;
  completedRevenue: number;
  averageOrderValue: number;
  availableItems: number;
  unavailableItems: number;
  menuSize: number;
  acceptingOrders: boolean;
  inventoryEnabled: boolean;
  recipeCostingEnabled: boolean;
};

export type RestaurantBrain = {
  generatedAt: string;
  revenue: number;
  completedRevenue: number;
  averageOrderValue: number;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  availableItems: number;
  unavailableItems: number;
  health: RestaurantHealth;
  forecast: RestaurantForecast;
  trends: RestaurantTrends;
  timeline: TimelineEvent[];
  recommendations: BrainRecommendation[];
  topSellers: TopSeller[];
  strongestOpportunity: {
    title: string;
    description: string;
    target: RecommendationTarget;
  };
};
