import { pgTable, text, timestamp, integer, boolean, numeric, uuid, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const syncStatusEnum = pgEnum('sync_status', ['synced', 'pending', 'conflict']);

export const productsTable = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: text("sku").notNull().unique(),
  barcode: text("barcode").unique(),
  name: text("name").notNull(),
  categoryId: text("category_id"),
  
  // Inventory tracking fundamentals
  primaryUnit: text("primary_unit").notNull(), // e.g., 'pcs', 'bags'. All base math happens here.
  stockQuantity: integer("stock_quantity").notNull().default(0),
  
  // Alerts configuration
  lowStockThreshold: integer("low_stock_threshold").notNull().default(0),
  criticalStockThreshold: integer("critical_stock_threshold").notNull().default(0),
  targetStockLevel: integer("target_stock_level"), // Threshold for overstock
  
  // Pricing
  costPrice: numeric("cost_price", { precision: 12, scale: 2 }),
  sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull(),
  
  // Offline-first fields
  isActive: boolean("is_active").default(true),
  syncStatus: syncStatusEnum("sync_status").notNull().default('synced'),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(), // Used for version checking / conflict resolution
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectProductSchema = createSelectSchema(productsTable);
