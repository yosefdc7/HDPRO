import { CreateMovementBody } from "@workspace/api-zod";
import { db, movementsTable, productsTable } from "@workspace/db";
import {
  applyMovement,
  StockEngineError,
  type StockMovementType,
} from "@workspace/stock-engine";
import { eq } from "drizzle-orm";
import type { z } from "zod";

export type CreateMovementParsed = z.infer<typeof CreateMovementBody>;

export type StockMovementRow = typeof movementsTable.$inferSelect;

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

async function selectMovementById(
  id: string,
): Promise<StockMovementRow | undefined> {
  const rows = await db
    .select()
    .from(movementsTable)
    .where(eq(movementsTable.id, id))
    .limit(1);
  return rows[0];
}

/**
 * Records a movement and updates product stock in one transaction.
 * Idempotent: duplicate `id` returns the existing row without changing stock.
 */
function assertIntegerQuantityBase(
  type: StockMovementType,
  quantityBase: number,
): void {
  if (!Number.isFinite(quantityBase) || !Number.isInteger(quantityBase)) {
    throw new StockEngineError(
      "INVALID_QUANTITY",
      "quantityBase must be a finite integer",
    );
  }
  if (type !== "ADJUSTMENT" && quantityBase < 0) {
    throw new StockEngineError(
      "INVALID_QUANTITY",
      "quantityBase must be non-negative for this movement type",
    );
  }
  if (type === "ADJUSTMENT" && quantityBase === 0) {
    throw new StockEngineError(
      "INVALID_ADJUSTMENT_ZERO",
      "Adjustment quantityBase (signed delta) must not be zero",
    );
  }
}

export async function createStockMovement(
  input: CreateMovementParsed,
): Promise<{ movement: StockMovementRow; status: 200 | 201 }> {
  assertIntegerQuantityBase(input.type as StockMovementType, input.quantityBase);
  try {
    return await db.transaction(async (tx) => {
      const existingRows = await tx
        .select()
        .from(movementsTable)
        .where(eq(movementsTable.id, input.id))
        .limit(1);
      const existing = existingRows[0];
      if (existing) {
        return { movement: existing, status: 200 as const };
      }

      const locked = await tx
        .select()
        .from(productsTable)
        .where(eq(productsTable.id, input.productId))
        .for("update")
        .limit(1);
      const product = locked[0];
      if (!product) {
        throw Object.assign(new Error("PRODUCT_NOT_FOUND"), { code: "PRODUCT_NOT_FOUND" });
      }
      if (!product.isActive) {
        throw Object.assign(new Error("PRODUCT_INACTIVE"), { code: "PRODUCT_INACTIVE" });
      }

      const applied = applyMovement({
        currentStockBase: product.stockQuantity,
        type: input.type as StockMovementType,
        quantityBase: input.quantityBase,
      });

      await tx.insert(movementsTable).values({
        id: input.id,
        productId: input.productId,
        type: input.type as StockMovementType,
        quantityBase: input.quantityBase,
        signedDeltaBase: applied.signedDeltaBase,
        quantityBeforeBase: applied.quantityBeforeBase,
        quantityAfterBase: applied.quantityAfterBase,
        sourceUnit: input.sourceUnit ?? null,
        reason: input.reason,
        notes: input.notes ?? null,
        actorUserId: input.actorUserId,
        capturedAt: input.capturedAt,
        syncStatus: input.syncStatus ?? "synced",
      });

      await tx
        .update(productsTable)
        .set({
          stockQuantity: applied.nextStockBase,
          updatedAt: new Date(),
        })
        .where(eq(productsTable.id, input.productId));

      const inserted = await tx
        .select()
        .from(movementsTable)
        .where(eq(movementsTable.id, input.id))
        .limit(1);
      const row = inserted[0];
      if (!row) {
        throw new Error("MOVEMENT_INSERT_MISSING");
      }
      return { movement: row, status: 201 as const };
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      const row = await selectMovementById(input.id);
      if (row) {
        return { movement: row, status: 200 };
      }
    }
    throw err;
  }
}

export function mapStockEngineError(err: unknown): {
  status: number;
  body: { error: string; code?: string };
} | null {
  if (!(err instanceof StockEngineError)) return null;
  if (err.code === "INSUFFICIENT_STOCK") {
    return { status: 409, body: { error: err.message, code: err.code } };
  }
  return {
    status: 400,
    body: { error: err.message, code: err.code },
  };
}

export function mapServiceError(err: unknown): {
  status: number;
  body: { error: string; code?: string };
} | null {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "PRODUCT_NOT_FOUND"
  ) {
    return {
      status: 404,
      body: { error: "Product not found", code: "PRODUCT_NOT_FOUND" },
    };
  }
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "PRODUCT_INACTIVE"
  ) {
    return {
      status: 400,
      body: { error: "Product is not active", code: "PRODUCT_INACTIVE" },
    };
  }
  return null;
}
