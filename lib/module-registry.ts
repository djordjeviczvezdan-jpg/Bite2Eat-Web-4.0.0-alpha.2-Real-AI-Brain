export const restaurantModules = {
  inventory: {
    key: "inventoryEnabled",
    name: "Inventory & suppliers",
    description: "Ingredients, suppliers, stock levels and movement history.",
    optional: true
  },
  recipes: {
    key: "recipeCostingEnabled",
    name: "Recipes & food costing",
    description: "Link menu items to ingredients and deduct stock automatically.",
    optional: true,
    requires: "inventory"
  }
} as const;

export type RestaurantModuleKey = keyof typeof restaurantModules;
