import { z } from "zod";
import { STOCK_MOVEMENT_TYPES } from "./types";

const futureSlackMs = 5 * 60 * 1000;

export const stockMovementTypeSchema = z.enum(STOCK_MOVEMENT_TYPES);

/** Server persistence may require UUID; clients / demos may use other string ids. */
const idSchema = z.string().min(1);

export const createStockMovementBaseSchema = z
  .object({
    id: idSchema,
    productId: idSchema,
    type: stockMovementTypeSchema,
    /**
     * Base-unit quantity: magnitude for normal types; signed delta for ADJUSTMENT.
     */
    quantityBase: z.number().int(),
    reason: z.string().trim().min(1, "reason is required"),
    note: z.string().max(2000).optional(),
    actorUserId: z.string().trim().min(1, "actorUserId is required"),
    capturedAt: z.coerce.date(),
    /** When the entry was created offline and not yet acknowledged by server */
    syncStatus: z.enum(["synced", "pending", "conflict"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "ADJUSTMENT") {
      if (data.quantityBase === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Adjustment quantityBase (signed delta) must not be zero",
          path: ["quantityBase"],
        });
      }
    } else if (data.quantityBase < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "quantityBase must be non-negative for this movement type",
        path: ["quantityBase"],
      });
    }
  })
  .superRefine((data, ctx) => {
    const now = Date.now();
    if (data.capturedAt.getTime() > now + futureSlackMs) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "capturedAt cannot be far in the future",
        path: ["capturedAt"],
      });
    }
  });

export type CreateStockMovementInput = z.infer<typeof createStockMovementBaseSchema>;
