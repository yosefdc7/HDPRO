export type ConversionErrorCode =
  | "INVALID_QUANTITY"
  | "UNKNOWN_UNIT"
  | "AMBIGUOUS_PATH"
  | "PATH_TOO_DEEP"
  | "NON_INTEGER_INTERMEDIATE"
  | "NOT_EXACTLY_DIVISIBLE"
  | "UNSUPPORTED_INVERSE";

export class ConversionError extends Error {
  constructor(
    public readonly code: ConversionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ConversionError";
  }
}
