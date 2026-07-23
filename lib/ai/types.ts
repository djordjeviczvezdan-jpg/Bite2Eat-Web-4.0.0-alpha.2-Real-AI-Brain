export type CopilotFunctionName =
  | "today_revenue"
  | "low_stock"
  | "top_customers"
  | "best_sellers"
  | "profitability"
  | "navigate"
  | "general_help";

export type CopilotLink = { label: string; href: string };

export type CopilotResponse = {
  answer: string;
  functionName: CopilotFunctionName;
  confidence: number;
  links?: CopilotLink[];
  generatedAt: string;
};
