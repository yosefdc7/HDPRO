import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { syncStatusEnum } from "./products";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const suppliersTable = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  contact: text("contact"),
  phone: text("phone"),
  email: text("email"),
  
  syncStatus: syncStatusEnum("sync_status").notNull().default('synced'),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const selectSupplierSchema = createSelectSchema(suppliersTable);
