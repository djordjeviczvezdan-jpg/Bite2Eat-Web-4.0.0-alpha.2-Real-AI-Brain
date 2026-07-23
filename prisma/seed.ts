// @ts-nocheck
import { PrismaClient, Prisma } from "@prisma/client";
import { tenants } from "../lib/tenants";
import { jimmysMenu } from "../data/jimmys-menu";
import { randomBytes, scryptSync } from "node:crypto";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

const prisma = new PrismaClient();

const modifierDefinitions = {
  "pizza-size": { name: "Choose size", required: true, min: 1, max: 1, options: [["10 inch",0,true],["12 inch",2,false],["14 inch",4,false]] },
  "pizza-toppings": { name: "Extra toppings", required: false, min: 0, max: 6, options: [["Pepperoni",1.5],["Ham",1.5],["Chicken",1.5],["Bacon",1.5],["Mushroom",1],["Onion",1],["Peppers",1],["Jalapeños",1],["Olives",1],["Pineapple",1],["Sweetcorn",1],["Extra cheese",1.5]] },
  "pizza-toppings-3": { name: "Choose up to 3 toppings", required: false, min: 0, max: 3, options: [["Pepperoni",0],["Ham",0],["Chicken",0],["Bacon",0],["Mushroom",0],["Onion",0],["Peppers",0],["Jalapeños",0],["Olives",0],["Pineapple",0],["Sweetcorn",0],["Extra cheese",0]] },
  "burger-removals": { name: "Remove ingredients", required: false, min: 0, max: 6, options: [["No lettuce",0],["No onions",0],["No mayo",0],["No ketchup",0],["No cheese",0],["No sauce",0]] },
  "burger-extras": { name: "Add extras", required: false, min: 0, max: 5, options: [["Cheese",0.7],["Bacon",1.2],["Jalapeños",0.7],["Extra patty",2.5],["Fried onions",0.7]] },
  "meal-upgrade": { name: "Make it a meal", required: false, min: 0, max: 1, options: [["Add chips",3],["Add chips and a can",5.5]] },
  "meal-drink": { name: "Choose your drink", required: true, min: 1, max: 1, options: [["Coca-Cola",0],["Coke Zero",0],["Diet Coca-Cola",0],["Club Orange",0],["Fanta",0],["Sprite Zero",0],["Water",0]] },
  "kids-drink": { name: "Choose kids drink", required: true, min: 1, max: 1, options: [["Orange Capri Sun",0],["Water",0]] },
  "sauces": { name: "Choose sauces", required: false, min: 0, max: 3, options: [["Garlic",0],["Chilli",0],["Curry",0],["Ketchup",0],["Mayo",0],["BBQ",0],["Taco",0],["Burger sauce",0]] },
  "sauces-required": { name: "Choose a sauce", required: true, min: 1, max: 1, options: [["Garlic",0],["Chilli",0],["Curry",0],["Ketchup",0],["Mayo",0],["BBQ",0],["Taco",0],["Burger sauce",0]] },
  "kebab-meat": { name: "Choose meat", required: true, min: 1, max: 1, options: [["Doner",0],["Chicken",0],["Mixed",0.6]] },
  "kebab-sauces": { name: "Choose kebab sauces", required: false, min: 0, max: 2, options: [["Garlic",0,true],["Chilli",0,true],["No sauce",0]] },
  "kebab-salad": { name: "Salad", required: false, min: 0, max: 4, options: [["Lettuce",0,true],["Cabbage",0,true],["Onion",0],["No salad",0]] },
  "sub-removals": { name: "Remove ingredients", required: false, min: 0, max: 6, options: [["No cheese",0],["No mushroom",0],["No peppers",0],["No onion",0],["No lettuce",0],["No cabbage",0]] },
  "family-dips": { name: "Choose 2 dips", required: true, min: 2, max: 2, options: [["Garlic",0],["Chilli",0],["Curry",0],["BBQ",0],["Taco",0]] }
};

async function seedJimmy() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "jimmys" },
    update: {
      name: "Jimmy's Takeaway Skerries",
      cuisine: "Pizza · Burgers · Kebabs · Fish & Chips",
      city: "Skerries",
      phone: "+35318495244",
      address: "Unit 2, Skerries Point, Kellys Bay, Skerries, Co. Dublin",
      website: "https://jimmystakeaway.com/",
      tagline: "Fresh favourites from Skerries, ordered your way.",
      accentColor: "#ffce43",
      deliveryFee: new Prisma.Decimal(3.5),
      minimumOrder: new Prisma.Decimal(15),
      freeDeliveryThreshold: new Prisma.Decimal(25),
      deliveryMinutes: "35–45",
      collectionMinutes: "15–20",
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 5
    },
    create: {
      slug: "jimmys",
      name: "Jimmy's Takeaway Skerries",
      cuisine: "Pizza · Burgers · Kebabs · Fish & Chips",
      city: "Skerries",
      phone: "+35318495244",
      address: "Unit 2, Skerries Point, Kellys Bay, Skerries, Co. Dublin",
      website: "https://jimmystakeaway.com/",
      tagline: "Fresh favourites from Skerries, ordered your way.",
      accentColor: "#ffce43",
      deliveryFee: new Prisma.Decimal(3.5),
      minimumOrder: new Prisma.Decimal(15),
      freeDeliveryThreshold: new Prisma.Decimal(25),
      deliveryMinutes: "35–45",
      collectionMinutes: "15–20",
      isActive: true,
      onboardingCompleted: true,
      onboardingStep: 5
    }
  });

  await prisma.staff.upsert({
    where: { restaurantId_email: { restaurantId: restaurant.id, email: "admin@jimmys.ie" } },
    update: { name: "Jimmy", role: "OWNER", isActive: true, passwordHash: hashPassword("demo12345") },
    create: { restaurantId: restaurant.id, email: "admin@jimmys.ie", passwordHash: hashPassword("demo12345"), name: "Jimmy", role: "OWNER", isActive: true }
  });

  const groups = new Map();
  let groupOrder = 0;
  for (const [key, definition] of Object.entries(modifierDefinitions)) {
    const group = await prisma.modifierGroup.upsert({
      where: { restaurantId_key: { restaurantId: restaurant.id, key } },
      update: { name: definition.name, required: definition.required, minSelections: definition.min, maxSelections: definition.max, sortOrder: groupOrder++ },
      create: { restaurantId: restaurant.id, key, name: definition.name, required: definition.required, minSelections: definition.min, maxSelections: definition.max, sortOrder: groupOrder++ }
    });
    await prisma.modifierOption.deleteMany({ where: { modifierGroupId: group.id } });
    await prisma.modifierOption.createMany({ data: definition.options.map((option, index) => ({ modifierGroupId: group.id, name: option[0], priceDelta: new Prisma.Decimal(option[1] || 0), defaultSelected: Boolean(option[2]), sortOrder: index })) });
    groups.set(key, group);
  }

  const keepIds = jimmysMenu.map(item => item.externalId);
  await prisma.menuItem.deleteMany({ where: { restaurantId: restaurant.id, externalId: { notIn: keepIds } } });

  for (const [sortOrder, item] of jimmysMenu.entries()) {
    const menuItem = await prisma.menuItem.upsert({
      where: { restaurantId_externalId: { restaurantId: restaurant.id, externalId: item.externalId } },
      update: { name: item.name, description: item.description, category: item.category, price: new Prisma.Decimal(item.price), emoji: item.emoji, imageUrl: item.imageUrl ?? null, badge: item.badge ?? null, available: true, sortOrder },
      create: { restaurantId: restaurant.id, externalId: item.externalId, name: item.name, description: item.description, category: item.category, price: new Prisma.Decimal(item.price), emoji: item.emoji, imageUrl: item.imageUrl ?? null, badge: item.badge ?? null, available: true, sortOrder }
    });
    await prisma.productModifierGroup.deleteMany({ where: { menuItemId: menuItem.id } });
    for (const [linkOrder, key] of (item.modifierKeys ?? []).entries()) {
      const group = groups.get(key);
      if (group) await prisma.productModifierGroup.create({ data: { menuItemId: menuItem.id, modifierGroupId: group.id, sortOrder: linkOrder } });
    }
  }
}

async function seedDemoTenants() {
  for (const tenant of tenants.filter(t => t.slug !== "jimmys")) {
    const restaurant = await prisma.restaurant.upsert({
      where: { slug: tenant.slug },
      update: { name: tenant.name, cuisine: tenant.cuisine, city: tenant.city, phone: tenant.settings.phone, address: tenant.settings.address, tagline: tenant.settings.tagline, accentColor: tenant.accent, deliveryFee: new Prisma.Decimal(tenant.settings.deliveryFee), minimumOrder: new Prisma.Decimal(tenant.settings.minimumOrder), freeDeliveryThreshold: new Prisma.Decimal(tenant.settings.freeDeliveryThreshold), deliveryMinutes: tenant.settings.deliveryMinutes, collectionMinutes: tenant.settings.collectionMinutes, isActive: true, onboardingCompleted: true, onboardingStep: 5 },
      create: { slug: tenant.slug, name: tenant.name, cuisine: tenant.cuisine, city: tenant.city, phone: tenant.settings.phone, address: tenant.settings.address, tagline: tenant.settings.tagline, accentColor: tenant.accent, deliveryFee: new Prisma.Decimal(tenant.settings.deliveryFee), minimumOrder: new Prisma.Decimal(tenant.settings.minimumOrder), freeDeliveryThreshold: new Prisma.Decimal(tenant.settings.freeDeliveryThreshold), deliveryMinutes: tenant.settings.deliveryMinutes, collectionMinutes: tenant.settings.collectionMinutes, isActive: true, onboardingCompleted: true, onboardingStep: 5 }
    });
    await prisma.staff.upsert({ where: { restaurantId_email: { restaurantId: restaurant.id, email: tenant.ownerEmail.toLowerCase() } }, update: { name: tenant.ownerName, role: "OWNER", isActive: true, passwordHash: hashPassword("demo12345") }, create: { restaurantId: restaurant.id, email: tenant.ownerEmail.toLowerCase(), passwordHash: hashPassword("demo12345"), name: tenant.ownerName, role: "OWNER", isActive: true } });
    for (const [sortOrder, item] of tenant.menu.entries()) {
      await prisma.menuItem.upsert({ where: { restaurantId_externalId: { restaurantId: restaurant.id, externalId: item.id } }, update: { name: item.name, description: item.description, category: item.category, price: new Prisma.Decimal(item.price), emoji: item.emoji, imageUrl: item.imageUrl ?? null, badge: item.badge, available: item.available ?? true, sortOrder }, create: { restaurantId: restaurant.id, externalId: item.id, name: item.name, description: item.description, category: item.category, price: new Prisma.Decimal(item.price), emoji: item.emoji, imageUrl: item.imageUrl ?? null, badge: item.badge, available: item.available ?? true, sortOrder } });
    }
  }
}

async function main() {
  await seedJimmy();
  await seedDemoTenants();
  console.log(`Bite2Eat seeded with ${await prisma.restaurant.count()} restaurants, ${await prisma.menuItem.count()} menu items and ${await prisma.modifierGroup.count()} modifier groups.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
