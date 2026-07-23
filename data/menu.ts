export type ModifierOption = {
  id: string;
  name: string;
  priceDelta: number;
  defaultSelected?: boolean;
};

export type ModifierGroup = {
  id: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  options: ModifierOption[];
};

export type MenuItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  badge?: string;
  emoji: string;
  imageUrl?: string;
  available?: boolean;
  modifierGroups?: ModifierGroup[];
};

export const menuItems: MenuItem[] = [];
export const categories = ["All"] as const;
