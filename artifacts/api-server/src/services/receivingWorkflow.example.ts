/**
 * Example: post a partial delivery receipt against a PO line with disposition buckets,
 * append-only stock ledger, and PO progress — wired to inventory_pro schema concepts.
 *
 * Not mounted as a route; copy patterns into your DB layer (Drizzle, Prisma, raw SQL).
 *
 * Audit chain: purchase_orders -> deliveries -> delivery_lines -> stock_transactions (source_doc_type delivery_line, source_doc_id = delivery_line.id)
 */

export type PoStatus =
  | "draft"
  | "approved"
  | "partially_received"
  | "received"
  | "cancelled";

/** Map UX labels to DB enums */
export const PO_STATUS_UX: Record<
  "pending" | "partially_received" | "fully_received" | "cancelled",
  PoStatus | PoStatus[]
> = {
  /** Treat as pending until first receipt: draft (internal) or approved (sent to supplier). */
  pending: ["draft", "approved"],
  partially_received: "partially_received",
  fully_received: "received",
  cancelled: "cancelled",
};

export type DeliveryLineDispositions = {
  poLineId: string;
  productId: string;
  locationId: string;
  unitId: string;
  acceptedQty: string;
  damagedQty: string;
  missingQty: string;
  rejectedQty: string;
  acceptedBaseQty: string;
  damagedBaseQty: string;
  missingBaseQty: string;
  rejectedBaseQty: string;
};

export type PostPartialReceiptInput = {
  deliveryId: string;
  idempotencyKey: string;
  performedByUserId: string;
  /** One stock txn header per post; lines link to delivery_line rows */
  lines: DeliveryLineDispositions[];
};

/**
 * Business rule (configurable): how much open PO quantity this receipt consumes.
 * - "all_dispositions": shrink open by accepted+damaged+rejected+missing (shipment fully accounted).
 * - "exclude_missing": shrink by accepted+damaged+missing only if you treat missing as still owed (uncommon).
 * Default here: all buckets except missing reduce "supplier still owes" — missing stays on open.
 */
export type OpenQtyPolicy = "all_non_missing" | "full_shipment";

function bigSum(a: string, b: string, c: string, d: string): bigint {
  return [a, b, c, d].reduce(
    (acc, x) => acc + BigInt(x.split(".")[0] || "0"),
    0n,
  );
}

/**
 * Example partial receipt (pseudo-SQL): one delivery line, one stock transaction, one ledger line (+accepted only).
 *
 * ```sql
 * BEGIN;
 *
 * INSERT INTO delivery_lines (
 *   delivery_id, po_line_id, product_id, location_id, received_unit_id,
 *   accepted_qty, damaged_qty, missing_qty, rejected_qty,
 *   accepted_base_qty, damaged_base_qty, missing_base_qty, rejected_base_qty, unit_cost_base
 * ) VALUES (
 *   $delivery_id, $po_line_id, $product_id, $location_id, $unit_id,
 *   50, 2, 10, 3,
 *   2500, 100, 500, 150, 0.10
 * )
 * RETURNING id AS delivery_line_id;
 * -- Note: missing 10 (base 500) stays on PO open if policy excludes_missing.
 *
 * INSERT INTO stock_transactions (
 *   txn_type, source_doc_type, source_doc_id, txn_time,
 *   performed_by_user_id, idempotency_key, notes
 * ) VALUES (
 *   'receipt', 'delivery_line', :delivery_line_id, now(),
 *   $user_id, $idempotency_key, 'Partial receipt'
 * ) RETURNING id AS stock_txn_id;
 *
 * INSERT INTO stock_transaction_lines (
 *   stock_transaction_id, product_id, location_id, delta_base_qty, note
 * ) VALUES (
 *   :stock_txn_id, $product_id, $location_id, 2500,
 *   'Accepted from delivery; damaged/rejected not stocked here'
 * );
 *
 * UPDATE purchase_order_lines
 * SET open_base_qty = open_base_qty - (2500 + 100 + 150)
 * WHERE id = $po_line_id AND open_base_qty >= (2500 + 100 + 150);
 *
 * UPDATE purchase_orders po
 * SET status = CASE
 *   WHEN EXISTS (
 *     SELECT 1 FROM purchase_order_lines l
 *     WHERE l.purchase_order_id = po.id AND l.open_base_qty > 0 AND l.deleted_at IS NULL
 *   ) THEN 'partially_received'::po_status
 *   ELSE 'received'::po_status
 * END
 * WHERE po.id = (SELECT purchase_order_id FROM purchase_order_lines WHERE id = $po_line_id);
 *
 * COMMIT;
 * ```
 */
export function describePartialReceiptExample(): string {
  return "See JSDoc SQL block in receivingWorkflow.example.ts";
}

/** Sanity-check in app code before commit */
export function validateDispositions(line: DeliveryLineDispositions): string | null {
  const keys: (keyof DeliveryLineDispositions)[] = [
    "acceptedBaseQty",
    "damagedBaseQty",
    "missingBaseQty",
    "rejectedBaseQty",
  ];
  for (const k of keys) {
    if (!/^-?\d+(\.\d+)?$/.test(line[k])) return `${k} must be numeric string`;
  }
  const total = bigSum(
    line.acceptedBaseQty,
    line.damagedBaseQty,
    line.missingBaseQty,
    line.rejectedBaseQty,
  );
  if (total <= 0n) return "At least one disposition base qty must sum to > 0";
  return null;
}

export function openQtyDeltaBase(
  line: DeliveryLineDispositions,
  policy: OpenQtyPolicy,
): bigint {
  const a = BigInt(line.acceptedBaseQty.split(".")[0] || "0");
  const dm = BigInt(line.damagedBaseQty.split(".")[0] || "0");
  const m = BigInt(line.missingBaseQty.split(".")[0] || "0");
  const r = BigInt(line.rejectedBaseQty.split(".")[0] || "0");
  if (policy === "full_shipment") return a + dm + m + r;
  return a + dm + r;
}
