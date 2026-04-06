export type StockEngineErrorCode =
  | "INVALID_QUANTITY"
  | "INVALID_ADJUSTMENT_ZERO"
  | "INSUFFICIENT_STOCK";

export class StockEngineError extends Error {
  readonly code: StockEngineErrorCode;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: StockEngineErrorCode,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  ) {
    super(message);
    this.name = "StockEngineError";
    this.code = code;
    this.details = details;
  }
}
