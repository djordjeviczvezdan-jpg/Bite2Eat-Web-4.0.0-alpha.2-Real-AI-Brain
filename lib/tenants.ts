import type { MenuItem } from "@/data/menu";
import type { RestaurantSettings } from "@/lib/menu-store";

export type Tenant = {
  slug: string; name: string; cuisine: string; city: string; accent: string;
  ownerEmail: string; ownerName: string; demoPassword: string; settings: RestaurantSettings; menu: MenuItem[];
};

const common = { acceptingOrders: true, cashEnabled: true, cardEnabled: true, freeDeliveryThreshold: 25, minimumOrder: 15, minimumCardOrder: 0, stripeChargesEnabled: false, requireCardPaymentBeforeKitchen: true };

export const tenants: Tenant[] = [
  {
    slug: "jimmys", name: "Jimmy's Takeaway", cuisine: "Burgers · Pizza · Fries", city: "Dublin 15", accent: "#ffce43",
    ownerEmail: "admin@jimmys.ie", ownerName: "Jimmy", demoPassword: "demo123",
    settings: { ...common, restaurantName: "Jimmy's Takeaway", tagline: "Your favourites, ordered your way.", phone: "01 555 0148", address: "Dublin 15", deliveryFee: 3.5, deliveryMinutes: "35–45", collectionMinutes: "15–20" },
    menu: [
      { id: 1, name: "Signature Cheeseburger", description: "Irish beef, mature cheddar, house sauce and pickles.", price: 9.5, category: "Burgers", emoji: "🍔", badge: "BEST SELLER", available: true },
      { id: 2, name: "Double Smash Burger", description: "Two smashed patties, cheese, onions and burger sauce.", price: 12.5, category: "Burgers", emoji: "🍔", available: true },
      { id: 3, name: "Crispy Chicken Burger", description: "Buttermilk chicken, slaw and spicy mayo.", price: 10.5, category: "Burgers", emoji: "🍗", available: true },
      { id: 4, name: "Pepperoni Feast", description: "Stone-baked pizza with double pepperoni and mozzarella.", price: 14.5, category: "Pizza", emoji: "🍕", badge: "POPULAR", available: true },
      { id: 5, name: "Margherita", description: "Tomato, mozzarella and fresh basil.", price: 11.5, category: "Pizza", emoji: "🍕", available: true },
      { id: 6, name: "Loaded Garlic Fries", description: "Garlic butter, parmesan and house seasoning.", price: 5.5, category: "Sides", emoji: "🍟", available: true },
      { id: 7, name: "Crispy Onion Rings", description: "Golden onion rings with smoky dip.", price: 4.5, category: "Sides", emoji: "🧅", available: true },
      { id: 8, name: "Coke Zero", description: "Chilled 330ml can.", price: 2.5, category: "Drinks", emoji: "🥤", available: true }
    ]
  },
  {
    slug: "marios", name: "Mario's Kitchen", cuisine: "Italian · Pasta · Pizza", city: "Dublin 2", accent: "#e85d3f",
    ownerEmail: "owner@marios.ie", ownerName: "Mario", demoPassword: "demo123",
    settings: { ...common, restaurantName: "Mario's Kitchen", tagline: "Real Italian food, made with heart.", phone: "01 555 0221", address: "Dublin 2", deliveryFee: 4, deliveryMinutes: "30–40", collectionMinutes: "15–20" },
    menu: [
      { id: 101, name: "Truffle Tagliatelle", description: "Fresh pasta, wild mushrooms, parmesan and truffle cream.", price: 17.5, category: "Burgers", emoji: "🍝", badge: "CHEF'S PICK", available: true },
      { id: 102, name: "Spaghetti Carbonara", description: "Guanciale, egg yolk, pecorino and black pepper.", price: 15.5, category: "Burgers", emoji: "🍝", available: true },
      { id: 103, name: "Diavola Pizza", description: "Tomato, mozzarella, spicy salami and chilli honey.", price: 16, category: "Pizza", emoji: "🍕", badge: "POPULAR", available: true },
      { id: 104, name: "Burrata Margherita", description: "San Marzano tomato, burrata and basil oil.", price: 15, category: "Pizza", emoji: "🍕", available: true },
      { id: 105, name: "Arancini", description: "Crisp risotto balls with mozzarella centre.", price: 7.5, category: "Sides", emoji: "🧆", available: true },
      { id: 106, name: "Tiramisu", description: "Espresso, mascarpone and cocoa.", price: 7, category: "Sides", emoji: "🍰", available: true },
      { id: 107, name: "San Pellegrino", description: "Sparkling Italian water.", price: 3, category: "Drinks", emoji: "🫧", available: true }
    ]
  },
  {
    slug: "green-bowl", name: "Green Bowl", cuisine: "Healthy · Vegan · Protein", city: "Dublin 4", accent: "#73c98b",
    ownerEmail: "hello@greenbowl.ie", ownerName: "Green Bowl team", demoPassword: "demo123",
    settings: { ...common, restaurantName: "Green Bowl", tagline: "Fresh fuel, built for your day.", phone: "01 555 0337", address: "Dublin 4", deliveryFee: 3, deliveryMinutes: "25–35", collectionMinutes: "10–15" },
    menu: [
      { id: 201, name: "Teriyaki Salmon Bowl", description: "Salmon, brown rice, edamame, cucumber and sesame.", price: 15.5, category: "Burgers", emoji: "🥗", badge: "BEST SELLER", available: true },
      { id: 202, name: "Green Goddess Bowl", description: "Avocado, quinoa, greens, chickpeas and herb dressing.", price: 13.5, category: "Burgers", emoji: "🥑", available: true },
      { id: 203, name: "Protein Power Bowl", description: "Chicken, sweet potato, broccoli, grains and tahini.", price: 14.5, category: "Burgers", emoji: "🥙", available: true },
      { id: 204, name: "Miso Tofu Bowl", description: "Crispy tofu, rice, slaw, edamame and miso glaze.", price: 13, category: "Pizza", emoji: "🍲", available: true },
      { id: 205, name: "Sweet Potato Fries", description: "Oven-roasted with sea salt.", price: 5, category: "Sides", emoji: "🍠", available: true },
      { id: 206, name: "Berry Protein Smoothie", description: "Berries, banana, oat milk and plant protein.", price: 6.5, category: "Drinks", emoji: "🥤", available: true }
    ]
  }
];

export function getTenant(slug: string) { return tenants.find((tenant) => tenant.slug === slug); }
