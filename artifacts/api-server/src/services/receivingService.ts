import {
  db,
  deliveriesTable,
  deliveryLinesTable,
  purchaseOrdersTable,
  purchaseOrderLinesTable,
  productsTable,
  stockLocationsTable,
  stockTransactionsTable,
  stockTransactionLinesTable,
  suppliersTable,
} from "@workspace/db";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createStockMovementInTransaction } from "./stockMovementService";
import { z } from "zod";

export class ReceivingError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 400,
  ) {
    super(message);
    this.name = "ReceivingError";
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

const poStatusSchema = z.enum([
  "draft",
  "approved",
  "partially_received",
  "received",
  "cancelled",
]);

export const createPurchaseOrderBodySchema = z.object({
  poNumber: z.string().min(1),
  supplierId: z.string().uuid(),
  orderDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expectedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
  status: poStatusSchema.optional().default("draft"),
  lines: z
    .array(
      z.object({
        lineNo: z.number().int().positive(),
        productId: z.string().uuid(),
        orderedBaseQty: z.number().int().positive(),
        unitPrice: z.string().optional(),
      }),
    )
    .min(1),
});

export const patchPurchaseOrderBodySchema = z.object({
  status: poStatusSchema.optional(),
});

export const createDeliveryBodySchema = z.object({
  deliveryNumber: z.string().min(1),
  purchaseOrderId: z.string().uuid().optional(),
  supplierId: z.string().uuid(),
  receivedAt: z.coerce.date(),
  receivedByUserId: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export const putDeliveryLinesBodySchema = z.object({
  lines: z
    .array(
      z.object({
        poLineId: z.string().uuid().optional(),
        productId: z.string().uuid(),
        locationId: z.string().uuid().optional(),
        acceptedQty: z.number().int().min(0),
        damagedQty: z.number().int().min(0),
        missingQty: z.number().int().min(0),
        rejectedQty: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const postDeliveryBodySchema = z.object({
  performedByUserId: z.string().min(1),
});

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function ensureDefaultStockLocation(tx: Tx): Promise<string> {
  const rows = await tx.select().from(stockLocationsTable).limit(1);
  if (rows[0]) return rows[0].id;
  const [ins] = await tx
    .insert(stockLocationsTable)
    .values({
      code: "DEFAULT",
      name: "Default warehouse",
    })
    .returning({ id: stockLocationsTable.id });
  if (!ins) throw new ReceivingError("Could not create stock location", "LOCATION_ERROR", 500);
  return ins.id;
}

async function lockDeliveryRow(tx: Tx, deliveryId: string) {
  const rows = await tx
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.id, deliveryId))
    .for("update")
    .limit(1);
  return rows[0];
}

export async function createPurchaseOrder(
  raw: z.infer<typeof createPurchaseOrderBodySchema>,
) {
  const input = createPurchaseOrderBodySchema.parse(raw);

  const sup = await db
    .select({ id: suppliersTable.id })
    .from(suppliersTable)
    .where(eq(suppliersTable.id, input.supplierId))
    .limit(1);
  if (!sup[0]) {
    throw new ReceivingError("Supplier not found", "SUPPLIER_NOT_FOUND", 404);
  }

  const lineNos = input.lines.map((l) => l.lineNo);
  if (new Set(lineNos).size !== lineNos.length) {
    throw new ReceivingError("Duplicate lineNo values", "INVALID_LINES");
  }

  const productIds = [...new Set(input.lines.map((l) => l.productId))];
  const products = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(inArray(productsTable.id, productIds));
  if (products.length !== productIds.length) {
    throw new ReceivingError("One or more products not found", "PRODUCT_NOT_FOUND", 404);
  }

  try {
    return await db.transaction(async (tx) => {
      const [po] = await tx
        .insert(purchaseOrdersTable)
        .values({
          poNumber: input.poNumber,
          supplierId: input.supplierId,
          status: input.status,
          orderDate: input.orderDate,
          expectedDate: input.expectedDate ?? null,
          notes: input.notes ?? null,
          updatedAt: new Date(),
        })
        .returning();

      if (!po) throw new ReceivingError("PO insert failed", "INSERT_ERROR", 500);

      for (const line of input.lines) {
        await tx.insert(purchaseOrderLinesTable).values({
          purchaseOrderId: po.id,
          lineNo: line.lineNo,
          productId: line.productId,
          orderedBaseQty: line.orderedBaseQty,
          openBaseQty: line.orderedBaseQty,
          unitPrice: line.unitPrice ?? null,
          updatedAt: new Date(),
        });
      }

      const lines = await tx
        .select()
        .from(purchaseOrderLinesTable)
        .where(eq(purchaseOrderLinesTable.purchaseOrderId, po.id));

      return { purchaseOrder: po, lines };
    });
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      throw new ReceivingError("PO number already exists", "DUPLICATE_PO", 409);
    }
    throw err;
  }
}

export async function listPurchaseOrders() {
  const pos = await db
    .select()
    .from(purchaseOrdersTable)
    .orderBy(desc(purchaseOrdersTable.createdAt));
  return pos;
}

export async function getPurchaseOrder(purchaseOrderId: string) {
  const poRows = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, purchaseOrderId))
    .limit(1);
  const po = poRows[0];
  if (!po) throw new ReceivingError("Purchase order not found", "PO_NOT_FOUND", 404);
  const lines = await db
    .select()
    .from(purchaseOrderLinesTable)
    .where(eq(purchaseOrderLinesTable.purchaseOrderId, purchaseOrderId))
    .orderBy(purchaseOrderLinesTable.lineNo);
  return { purchaseOrder: po, lines };
}

export async function patchPurchaseOrder(
  purchaseOrderId: string,
  raw: z.infer<typeof patchPurchaseOrderBodySchema>,
) {
  const input = patchPurchaseOrderBodySchema.parse(raw);
  if (!input.status) {
    throw new ReceivingError("No updates provided", "NO_OP");
  }

  if (input.status === "received" || input.status === "partially_received") {
    throw new ReceivingError(
      "Receipt status is updated automatically when deliveries are posted",
      "INVALID_STATUS_TRANSITION",
    );
  }

  const poRows = await db
    .select()
    .from(purchaseOrdersTable)
    .where(eq(purchaseOrdersTable.id, purchaseOrderId))
    .limit(1);
  const po = poRows[0];
  if (!po) throw new ReceivingError("Purchase order not found", "PO_NOT_FOUND", 404);

  if (input.status === "cancelled") {
    if (po.status === "received" || po.status === "partially_received") {
      throw new ReceivingError(
        "Cannot cancel a PO that has receipts",
        "PO_HAS_RECEIPTS",
        409,
      );
    }
  }

  const [updated] = await db
    .update(purchaseOrdersTable)
    .set({
      status: input.status,
      updatedAt: new Date(),
    })
    .where(eq(purchaseOrdersTable.id, purchaseOrderId))
    .returning();

  return updated!;
}

export async function createDelivery(raw: z.infer<typeof createDeliveryBodySchema>) {
  const input = createDeliveryBodySchema.parse(raw);

  const sup = await db
    .select()
    .from(suppliersTable)
    .where(eq(suppliersTable.id, input.supplierId))
    .limit(1);
  if (!sup[0]) throw new ReceivingError("Supplier not found", "SUPPLIER_NOT_FOUND", 404);

  if (input.purchaseOrderId) {
    const poRows = await db
      .select()
      .from(purchaseOrdersTable)
      .where(eq(purchaseOrdersTable.id, input.purchaseOrderId))
      .limit(1);
    const po = poRows[0];
    if (!po) throw new ReceivingError("Purchase order not found", "PO_NOT_FOUND", 404);
    if (po.supplierId !== input.supplierId) {
      throw new ReceivingError("Supplier must match purchase order", "SUPPLIER_MISMATCH");
    }
    if (po.status === "cancelled" || po.status === "received") {
      throw new ReceivingError("Purchase order is not open for receiving", "PO_CLOSED", 409);
    }
  }

  try {
    const [d] = await db
      .insert(deliveriesTable)
      .values({
        deliveryNumber: input.deliveryNumber,
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId ?? null,
        status: "draft",
        receivedAt: input.receivedAt,
        receivedByUserId: input.receivedByUserId ?? null,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .returning();

    if (!d) throw new ReceivingError("Delivery insert failed", "INSERT_ERROR", 500);
    return d;
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      throw new ReceivingError(
        "Delivery number already exists",
        "DUPLICATE_DELIVERY",
        409,
      );
    }
    throw err;
  }
}

export async function getDelivery(deliveryId: string) {
  const dRows = await db
    .select()
    .from(deliveriesTable)
    .where(eq(deliveriesTable.id, deliveryId))
    .limit(1);
  const delivery = dRows[0];
  if (!delivery)
    throw new ReceivingError("Delivery not found", "DELIVERY_NOT_FOUND", 404);
  const lines = await db
    .select()
    .from(deliveryLinesTable)
    .where(eq(deliveryLinesTable.deliveryId, deliveryId));
  return { delivery, lines };
}

export async function putDeliveryLines(
  deliveryId: string,
  raw: z.infer<typeof putDeliveryLinesBodySchema>,
) {
  const input = putDeliveryLinesBodySchema.parse(raw);

  return db.transaction(async (tx) => {
    const d = await lockDeliveryRow(tx, deliveryId);
    if (!d) throw new ReceivingError("Delivery not found", "DELIVERY_NOT_FOUND", 404);
    if (d.status !== "draft") {
      throw new ReceivingError("Only draft deliveries can be edited", "NOT_DRAFT", 409);
    }

    const defaultLoc = await ensureDefaultStockLocation(tx);

    const productIds = [...new Set(input.lines.map((l) => l.productId))];
    const products = await tx
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));
    if (products.length !== productIds.length) {
      throw new ReceivingError("One or more products not found", "PRODUCT_NOT_FOUND", 404);
    }

    for (const line of input.lines) {
      const sum =
        line.acceptedQty + line.damagedQty + line.missingQty + line.rejectedQty;
      if (sum <= 0) {
        throw new ReceivingError(
          "Each line must have a positive total disposition",
          "INVALID_DISPOSITION",
        );
      }
    }

    for (const line of input.lines) {
      if (line.poLineId && d.purchaseOrderId) {
        const polRows = await tx
          .select()
          .from(purchaseOrderLinesTable)
          .where(
            and(
              eq(purchaseOrderLinesTable.id, line.poLineId),
              eq(purchaseOrderLinesTable.purchaseOrderId, d.purchaseOrderId),
            ),
          )
          .limit(1);
        if (!polRows[0]) {
          throw new ReceivingError("PO line does not belong to this PO", "PO_LINE_MISMATCH");
        }
        if (polRows[0].productId !== line.productId) {
          throw new ReceivingError("Product does not match PO line", "PRODUCT_MISMATCH");
        }
      } else if (line.poLineId && !d.purchaseOrderId) {
        throw new ReceivingError("poLineId requires a linked purchase order", "PO_REQUIRED");
      }
    }

    await tx
      .delete(deliveryLinesTable)
      .where(eq(deliveryLinesTable.deliveryId, deliveryId));

    for (const line of input.lines) {
      await tx.insert(deliveryLinesTable).values({
        deliveryId,
        poLineId: line.poLineId ?? null,
        productId: line.productId,
        locationId: line.locationId ?? defaultLoc,
        acceptedQty: line.acceptedQty,
        damagedQty: line.damagedQty,
        missingQty: line.missingQty,
        rejectedQty: line.rejectedQty,
        updatedAt: new Date(),
      });
    }

    const lines = await tx
      .select()
      .from(deliveryLinesTable)
      .where(eq(deliveryLinesTable.deliveryId, deliveryId));

    return { delivery: d, lines };
  });
}

function openQtyConsumedByLine(line: {
  acceptedQty: number;
  damagedQty: number;
  missingQty: number;
  rejectedQty: number;
}): number {
  return (
    line.acceptedQty + line.damagedQty + line.rejectedQty
  );
}

export async function postDelivery(
  deliveryId: string,
  raw: z.infer<typeof postDeliveryBodySchema>,
) {
  const input = postDeliveryBodySchema.parse(raw);
  const idempotencyKey = `receipt:post:${deliveryId}`;

  return db.transaction(async (tx) => {
    const d = await lockDeliveryRow(tx, deliveryId);
    if (!d) throw new ReceivingError("Delivery not found", "DELIVERY_NOT_FOUND", 404);

    if (d.status === "posted") {
      const postedLines = await tx
        .select()
        .from(deliveryLinesTable)
        .where(eq(deliveryLinesTable.deliveryId, deliveryId));
      const ledger = await tx
        .select()
        .from(stockTransactionsTable)
        .where(eq(stockTransactionsTable.idempotencyKey, idempotencyKey))
        .limit(1);
      return {
        delivery: d,
        lines: postedLines,
        stockTransaction: ledger[0] ?? null,
        idempotent: true as const,
      };
    }

    if (d.status !== "draft") {
      throw new ReceivingError("Delivery cannot be posted", "INVALID_DELIVERY_STATE", 409);
    }

    const lines = await tx
      .select()
      .from(deliveryLinesTable)
      .where(eq(deliveryLinesTable.deliveryId, deliveryId));

    if (lines.length === 0) {
      throw new ReceivingError("Add lines before posting", "NO_LINES");
    }

    for (const line of lines) {
      const consume = openQtyConsumedByLine(line);
      if (consume <= 0) continue;
      if (line.poLineId) {
        const polRows = await tx
          .select()
          .from(purchaseOrderLinesTable)
          .where(eq(purchaseOrderLinesTable.id, line.poLineId))
          .for("update")
          .limit(1);
        const pol = polRows[0];
        if (!pol) throw new ReceivingError("PO line missing", "PO_LINE_NOT_FOUND", 404);
        if (pol.openBaseQty < consume) {
          throw new ReceivingError(
            `Open quantity insufficient for line ${pol.lineNo} (open ${pol.openBaseQty}, need ${consume})`,
            "OVER_RECEIVE",
            409,
          );
        }
      }
    }

    const now = new Date();

    for (const line of lines) {
      if (line.acceptedQty <= 0) continue;
      const movementId = randomUUID();
      await createStockMovementInTransaction(tx, {
        id: movementId,
        productId: line.productId,
        type: "DELIVERY_RECEIVED",
        quantityBase: line.acceptedQty,
        reason: `delivery:${deliveryId}:line:${line.id}`,
        notes: `Accepted qty from delivery ${d.deliveryNumber}`,
        actorUserId: input.performedByUserId,
        capturedAt: now,
        syncStatus: "synced",
      });
    }

    const [stockTxn] = await tx
      .insert(stockTransactionsTable)
      .values({
        txnType: "receipt",
        sourceDocType: "delivery",
        sourceDocId: deliveryId,
        txnTime: now,
        performedByUserId: input.performedByUserId,
        idempotencyKey,
        notes: `Receipt posted for ${d.deliveryNumber}`,
      })
      .returning();

    if (!stockTxn) throw new ReceivingError("Ledger insert failed", "LEDGER_ERROR", 500);

    for (const line of lines) {
      if (line.acceptedQty === 0) continue;
      await tx.insert(stockTransactionLinesTable).values({
        stockTransactionId: stockTxn.id,
        productId: line.productId,
        locationId: line.locationId,
        deltaBaseQty: line.acceptedQty,
        note: `delivery_line:${line.id} accepted=${line.acceptedQty} damaged=${line.damagedQty} missing=${line.missingQty} rejected=${line.rejectedQty}`,
      });
    }

    for (const line of lines) {
      if (!line.poLineId) continue;
      const consume = openQtyConsumedByLine(line);
      if (consume <= 0) continue;
      await tx
        .update(purchaseOrderLinesTable)
        .set({
          openBaseQty: sql`${purchaseOrderLinesTable.openBaseQty} - ${consume}`,
          updatedAt: now,
        })
        .where(eq(purchaseOrderLinesTable.id, line.poLineId));
    }

    if (d.purchaseOrderId) {
      const poLineRows = await tx
        .select()
        .from(purchaseOrderLinesTable)
        .where(eq(purchaseOrderLinesTable.purchaseOrderId, d.purchaseOrderId));

      const anyOpen = poLineRows.some((l) => l.openBaseQty > 0);
      const newStatus = anyOpen ? "partially_received" : "received";
      await tx
        .update(purchaseOrdersTable)
        .set({
          status: newStatus,
          updatedAt: now,
        })
        .where(eq(purchaseOrdersTable.id, d.purchaseOrderId));
    }

    await tx
      .update(deliveriesTable)
      .set({ status: "posted", updatedAt: now })
      .where(eq(deliveriesTable.id, deliveryId));

    const posted = await tx
      .select()
      .from(deliveriesTable)
      .where(eq(deliveriesTable.id, deliveryId))
      .limit(1);

    const outLines = await tx
      .select()
      .from(deliveryLinesTable)
      .where(eq(deliveryLinesTable.deliveryId, deliveryId));

    return {
      delivery: posted[0]!,
      lines: outLines,
      stockTransaction: stockTxn,
      idempotent: false as const,
    };
  });
}

export async function getProductIncoming(productId: string) {
  const productRows = await db
    .select({ id: productsTable.id })
    .from(productsTable)
    .where(eq(productsTable.id, productId))
    .limit(1);
  if (!productRows[0]) {
    throw new ReceivingError("Product not found", "PRODUCT_NOT_FOUND", 404);
  }

  const rows = await db
    .select({
      incomingOpenBaseQty: sql<number>`coalesce(sum(${purchaseOrderLinesTable.openBaseQty}), 0)::int`,
    })
    .from(purchaseOrderLinesTable)
    .innerJoin(
      purchaseOrdersTable,
      eq(purchaseOrderLinesTable.purchaseOrderId, purchaseOrdersTable.id),
    )
    .where(
      and(
        eq(purchaseOrderLinesTable.productId, productId),
        inArray(purchaseOrdersTable.status, [
          "draft",
          "approved",
          "partially_received",
        ]),
      ),
    );

  return {
    productId,
    incomingOpenBaseQty: rows[0]?.incomingOpenBaseQty ?? 0,
  };
}
