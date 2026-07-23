CREATE TYPE "InventoryUnit" AS ENUM ('KG', 'G', 'L', 'ML', 'PCS');
CREATE TYPE "StockMovementType" AS ENUM ('RECEIVED', 'ADJUSTMENT', 'WASTE', 'ORDER_DEDUCTION');

CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "leadTimeDays" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Ingredient" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "supplierId" TEXT,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "unit" "InventoryUnit" NOT NULL,
  "currentStock" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "minimumStock" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "reorderLevel" DECIMAL(14,3) NOT NULL DEFAULT 0,
  "costPerUnit" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StockMovement" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "quantity" DECIMAL(14,3) NOT NULL,
  "balanceAfter" DECIMAL(14,3) NOT NULL,
  "reason" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Supplier_restaurantId_name_key" ON "Supplier"("restaurantId", "name");
CREATE INDEX "Supplier_restaurantId_active_idx" ON "Supplier"("restaurantId", "active");
CREATE UNIQUE INDEX "Ingredient_restaurantId_name_key" ON "Ingredient"("restaurantId", "name");
CREATE INDEX "Ingredient_restaurantId_category_active_idx" ON "Ingredient"("restaurantId", "category", "active");
CREATE INDEX "Ingredient_restaurantId_currentStock_idx" ON "Ingredient"("restaurantId", "currentStock");
CREATE INDEX "StockMovement_restaurantId_createdAt_idx" ON "StockMovement"("restaurantId", "createdAt");
CREATE INDEX "StockMovement_ingredientId_createdAt_idx" ON "StockMovement"("ingredientId", "createdAt");
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ingredient" ADD CONSTRAINT "Ingredient_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
