ALTER TABLE "Restaurant"
ADD COLUMN "inventoryEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Keep the inventory module visible for restaurants that were already using
-- the Inventory Foundation before this optional-module release.
UPDATE "Restaurant"
SET "inventoryEnabled" = true
WHERE EXISTS (
  SELECT 1 FROM "Ingredient" WHERE "Ingredient"."restaurantId" = "Restaurant"."id"
) OR EXISTS (
  SELECT 1 FROM "Supplier" WHERE "Supplier"."restaurantId" = "Restaurant"."id"
);
