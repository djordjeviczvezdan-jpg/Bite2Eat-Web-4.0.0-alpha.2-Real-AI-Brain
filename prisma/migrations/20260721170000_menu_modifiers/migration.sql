CREATE TABLE "ModifierGroup" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "minSelections" INTEGER NOT NULL DEFAULT 0,
  "maxSelections" INTEGER NOT NULL DEFAULT 1,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ModifierGroup_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ModifierOption" (
  "id" TEXT NOT NULL,
  "modifierGroupId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "priceDelta" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "defaultSelected" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "available" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "ModifierOption_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProductModifierGroup" (
  "menuItemId" TEXT NOT NULL,
  "modifierGroupId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ProductModifierGroup_pkey" PRIMARY KEY ("menuItemId", "modifierGroupId")
);
CREATE UNIQUE INDEX "ModifierGroup_restaurantId_key_key" ON "ModifierGroup"("restaurantId", "key");
CREATE INDEX "ModifierGroup_restaurantId_sortOrder_idx" ON "ModifierGroup"("restaurantId", "sortOrder");
CREATE INDEX "ModifierOption_modifierGroupId_sortOrder_idx" ON "ModifierOption"("modifierGroupId", "sortOrder");
CREATE INDEX "ProductModifierGroup_modifierGroupId_idx" ON "ProductModifierGroup"("modifierGroupId");
ALTER TABLE "ModifierGroup" ADD CONSTRAINT "ModifierGroup_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModifierOption" ADD CONSTRAINT "ModifierOption_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductModifierGroup" ADD CONSTRAINT "ProductModifierGroup_modifierGroupId_fkey" FOREIGN KEY ("modifierGroupId") REFERENCES "ModifierGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
