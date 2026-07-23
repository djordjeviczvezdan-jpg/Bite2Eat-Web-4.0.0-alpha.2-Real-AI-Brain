import type { CopilotFunctionName } from "@/lib/ai/types";

export const COPILOT_FUNCTIONS: Record<CopilotFunctionName, { description: string; readOnly: true }> = {
  today_revenue: { description: "Read today's paid order revenue and order count.", readOnly: true },
  low_stock: { description: "Read ingredients at or below their reorder level.", readOnly: true },
  top_customers: { description: "Read top customers by total restaurant spend.", readOnly: true },
  best_sellers: { description: "Read best-selling menu items by quantity.", readOnly: true },
  profitability: { description: "Read estimated menu gross profit and margin.", readOnly: true },
  navigate: { description: "Open an existing restaurant administration screen.", readOnly: true },
  general_help: { description: "Explain the read-only capabilities of Bite2Eat Copilot.", readOnly: true }
};
