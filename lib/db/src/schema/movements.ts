import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { productsTable, syncStatusEnum } from "./products";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { STOCK_MOVEMENT_TYPES_PG } from "@workspace/stock-engine";

export const movementTypeEnum = pgEnum("movement_type", STOCK_MOVEMENT_TYPES_PG);

export const movementsTable = pgTable("movements", {
  /** Client-generated id for offline-first idempotency */
  id: uuid("id").primaryKey(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id),
  type: movementTypeEnum("type").notNull(),
  /** Magnitude in base units, or signed delta for ADJUSTMENT */
  quantityBase: integer("quantity_base").notNull(),
  signedDeltaBase: integer("signed_delta_base").notNull(),
  quantityBeforeBase: integer("quantity_before_base").notNull(),
  quantityAfterBase: integer("quantity_after_base").notNull(),
  /** Original user unit for audit / UI (optional when already base) */
  sourceUnit: text("source_unit"),
  reason: text("reason").notNull(),
  notes: text("notes"),
  actorUserId: text("actor_user_id").notNull(),

  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  syncStatus: syncStatusEnum("sync_status").notNull().default("synced"),
  mobileSnapshot: jsonb("mobile_snapshot"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const insertMovementSchema = createInsertSchema(movementsTable).omit({
  createdAt: true,
});
export const selectMovementSchema = createSelectSchema(movementsTable);
