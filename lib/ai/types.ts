import type { MenuItem } from "@/data/menu";
import type { RestaurantOrder } from "@/lib/order-types";
import type { RestaurantSettings } from "@/lib/menu-store";

export type BrainInput = {
  menu: MenuItem[];
  orders: RestaurantOrder[];
  settings: RestaurantSettings;
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

export type RestaurantForecast = {
  predictedClosingRevenue: number;
  predictedOrders: number;
  confidence: number;
  kitchenPressure: number;
  kitchenStatus: "Under control" | "Busy" | "High pressure";
};

export type TopSeller = {
  id: number;
  name: string;
  quantity: number;
  revenue: number;
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
  recommendations: BrainRecommendation[];
  topSellers: TopSeller[];
  strongestOpportunity: {
    title: string;
    description: string;
    target: RecommendationTarget;
  };
};
