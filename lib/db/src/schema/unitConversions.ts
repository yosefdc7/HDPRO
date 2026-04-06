import { pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";
import { productsTable, syncStatusEnum } from "./products";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const unitConversionsTable = pgTable("unit_conversions", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => productsTable.id),
  
  // Example: fromUnit = 'box', toUnit = 'pcs', factor = 100
  fromUnit: text("from_unit").notNull(),
  toUnit: text("to_unit").notNull(),
  factor: integer("factor").notNull(), 
  
  // Offline-first fields (less likely to conflict, but good practice)
  syncStatus: syncStatusEnum("sync_status").notNull().default('synced'),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUnitConversionSchema = createInsertSchema(unitConversionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectUnitConversionSchema = createSelectSchema(unitConversionsTable);
