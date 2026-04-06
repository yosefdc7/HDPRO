import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  pgEnum,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { productsTable } from "./products";
import { suppliersTable } from "./suppliers";

export const purchaseOrderStatusEnum = pgEnum("purchase_order_status", [
  "draft",
  "approved",
  "partially_received",
  "received",
  "cancelled",
]);

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "draft",
  "posted",
  "voided",
]);

export const ledgerTxnTypeEnum = pgEnum("ledger_txn_type", ["receipt"]);

export const ledgerSourceDocEnum = pgEnum("ledger_source_doc", [
  "delivery",
  "delivery_line",
  "manual",
]);

export const stockLocationsTable = pgTable("stock_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const purchaseOrdersTable = pgTable("purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  poNumber: text("po_number").notNull().unique(),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliersTable.id),
  status: purchaseOrderStatusEnum("status").notNull().default("draft"),
  orderDate: date("order_date").notNull(),
  expectedDate: date("expected_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const purchaseOrderLinesTable = pgTable(
  "purchase_order_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    purchaseOrderId: uuid("purchase_order_id")
      .notNull()
      .references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
    lineNo: integer("line_no").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => productsTable.id),
    orderedBaseQty: integer("ordered_base_qty").notNull(),
    openBaseQty: integer("open_base_qty").notNull(),
    unitPrice: text("unit_price"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("uq_po_line_no").on(t.purchaseOrderId, t.lineNo),
  ],
);

export const deliveriesTable = pgTable("deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  deliveryNumber: text("delivery_number").notNull().unique(),
  supplierId: uuid("supplier_id")
    .notNull()
    .references(() => suppliersTable.id),
  purchaseOrderId: uuid("purchase_order_id").references(
    () => purchaseOrdersTable.id,
  ),
  status: deliveryStatusEnum("status").notNull().default("draft"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  receivedByUserId: text("received_by_user_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Quantities are stored in product primary (base) units to match `products.stock_quantity`. */
export const deliveryLinesTable = pgTable("delivery_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  deliveryId: uuid("delivery_id")
    .notNull()
    .references(() => deliveriesTable.id, { onDelete: "cascade" }),
  poLineId: uuid("po_line_id").references(() => purchaseOrderLinesTable.id),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id),
  locationId: uuid("location_id")
    .notNull()
    .references(() => stockLocationsTable.id),
  acceptedQty: integer("accepted_qty").notNull().default(0),
  damagedQty: integer("damaged_qty").notNull().default(0),
  missingQty: integer("missing_qty").notNull().default(0),
  rejectedQty: integer("rejected_qty").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const stockTransactionsTable = pgTable("stock_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  txnType: ledgerTxnTypeEnum("txn_type").notNull(),
  sourceDocType: ledgerSourceDocEnum("source_doc_type").notNull(),
  sourceDocId: uuid("source_doc_id").notNull(),
  txnTime: timestamp("txn_time", { withTimezone: true }).notNull(),
  performedByUserId: text("performed_by_user_id").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const stockTransactionLinesTable = pgTable("stock_transaction_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  stockTransactionId: uuid("stock_transaction_id")
    .notNull()
    .references(() => stockTransactionsTable.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id),
  locationId: uuid("location_id")
    .notNull()
    .references(() => stockLocationsTable.id),
  deltaBaseQty: integer("delta_base_qty").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
