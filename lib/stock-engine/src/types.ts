export const STOCK_MOVEMENT_TYPES = [
  "PURCHASE_RECEIVED",
  "SALE",
  "ADJUSTMENT",
  "DAMAGE",
  "RETURN_IN",
  "RETURN_OUT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "DELIVERY_RECEIVED",
] as const;

export type StockMovementType = (typeof STOCK_MOVEMENT_TYPES)[number];

/** For PostgreSQL / Drizzle `pgEnum` — tuple of at least one element */
export const STOCK_MOVEMENT_TYPES_PG: [StockMovementType, ...StockMovementType[]] =
  STOCK_MOVEMENT_TYPES as unknown as [StockMovementType, ...StockMovementType[]];

export const STOCK_INCREASING_TYPES = new Set<StockMovementType>([
  "PURCHASE_RECEIVED",
  "RETURN_IN",
  "TRANSFER_IN",
  "DELIVERY_RECEIVED",
]);

export const STOCK_DECREASING_TYPES = new Set<StockMovementType>([
  "SALE",
  "DAMAGE",
  "RETURN_OUT",
  "TRANSFER_OUT",
]);

export type ReplayMovementSlice = Readonly<{
  id: string;
  capturedAt: Date | string;
  type: StockMovementType;
  /**
   * For ADJUSTMENT: signed delta in base units. For other types: non-negative magnitude.
   */
  quantityBase: number;
}>;
