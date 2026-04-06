import { pgTable, text, timestamp, integer, uuid, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { productsTable, syncStatusEnum } from "./products";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const movementTypeEnum = pgEnum('movement_type', [
  'IN', 
  'OUT', 
  'ADJUSTMENT', 
  'DELIVERY', 
  'DAMAGE', 
  'RETURN', 
  'TRANSFER'
]);

export const movementsTable = pgTable("movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  type: movementTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(), // Quantity passed. Base business logic translates this against unit factors.
  unit: text("unit").notNull(), // E.g., 'box', 'pcs', 'roll'
  notes: text("notes"),
  
  // Offline-first fields
  capturedAt: timestamp("captured_at").notNull(), // True timestamp of when movement happened offline
  syncStatus: syncStatusEnum("sync_status").notNull().default('synced'),
  mobileSnapshot: jsonb("mobile_snapshot"), // On 409 conflict, store the conflicting offline payload
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMovementSchema = createInsertSchema(movementsTable).omit({ id: true, createdAt: true });
export const selectMovementSchema = createSelectSchema(movementsTable);
