import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, deliveriesTable } from "@workspace/db";
import {
  createDelivery,
  createDeliveryBodySchema,
  createPurchaseOrder,
  createPurchaseOrderBodySchema,
  getDelivery,
  getProductIncoming,
  getPurchaseOrder,
  listPurchaseOrders,
  patchPurchaseOrder,
  patchPurchaseOrderBodySchema,
  postDelivery,
  postDeliveryBodySchema,
  putDeliveryLines,
  putDeliveryLinesBodySchema,
  ReceivingError,
} from "../services/receivingService";
import {
  mapServiceError,
  mapStockEngineError,
} from "../services/stockMovementService";

const router = Router();

function mapReceivingError(err: unknown): {
  status: number;
  body: { error: string; code?: string };
} | null {
  if (err instanceof ReceivingError) {
    return {
      status: err.status,
      body: { error: err.message, code: err.code },
    };
  }
  return null;
}

router.get("/receiving/purchase-orders", async (req: Request, res: Response) => {
  try {
    const pos = await listPurchaseOrders();
    res.json(pos);
  } catch (err: unknown) {
    req.log.error({ err }, "listPurchaseOrders");
    res.status(500).json({ error: "Failed to list purchase orders" });
  }
});

router.get("/receiving/purchase-orders/:id", async (req: Request, res: Response) => {
  try {
    const data = await getPurchaseOrder(req.params.id);
    res.json(data);
  } catch (err: unknown) {
    const m = mapReceivingError(err);
    if (m) {
      res.status(m.status).json(m.body);
      return;
    }
    req.log.error({ err }, "getPurchaseOrder");
    res.status(500).json({ error: "Failed to load purchase order" });
  }
});

router.post("/receiving/purchase-orders", async (req: Request, res: Response) => {
  try {
    const parsed = createPurchaseOrderBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      return;
    }
    const created = await createPurchaseOrder(parsed.data);
    res.status(201).json(created);
  } catch (err: unknown) {
    const m = mapReceivingError(err);
    if (m) {
      res.status(m.status).json(m.body);
      return;
    }
    req.log.error({ err }, "createPurchaseOrder");
    res.status(500).json({ error: "Failed to create purchase order" });
  }
});

router.patch("/receiving/purchase-orders/:id", async (req: Request, res: Response) => {
  try {
    const parsed = patchPurchaseOrderBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      return;
    }
    const updated = await patchPurchaseOrder(req.params.id, parsed.data);
    res.json(updated);
  } catch (err: unknown) {
    const m = mapReceivingError(err);
    if (m) {
      res.status(m.status).json(m.body);
      return;
    }
    req.log.error({ err }, "patchPurchaseOrder");
    res.status(500).json({ error: "Failed to update purchase order" });
  }
});

router.post("/receiving/deliveries", async (req: Request, res: Response) => {
  try {
    const parsed = createDeliveryBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      return;
    }
    const d = await createDelivery(parsed.data);
    res.status(201).json(d);
  } catch (err: unknown) {
    const m = mapReceivingError(err);
    if (m) {
      res.status(m.status).json(m.body);
      return;
    }
    req.log.error({ err }, "createDelivery");
    res.status(500).json({ error: "Failed to create delivery" });
  }
});

router.get("/receiving/deliveries", async (req: Request, res: Response) => {
  try {
    const poId = typeof req.query.purchaseOrderId === "string" ? req.query.purchaseOrderId : undefined;
    if (poId) {
      const rows = await db
        .select()
        .from(deliveriesTable)
        .where(eq(deliveriesTable.purchaseOrderId, poId));
      res.json(rows);
      return;
    }
    const all = await db.select().from(deliveriesTable);
    res.json(all);
  } catch (err: unknown) {
    req.log.error({ err }, "listDeliveries");
    res.status(500).json({ error: "Failed to list deliveries" });
  }
});

router.get("/receiving/deliveries/:id", async (req: Request, res: Response) => {
  try {
    const data = await getDelivery(req.params.id);
    res.json(data);
  } catch (err: unknown) {
    const m = mapReceivingError(err);
    if (m) {
      res.status(m.status).json(m.body);
      return;
    }
    req.log.error({ err }, "getDelivery");
    res.status(500).json({ error: "Failed to load delivery" });
  }
});

router.put("/receiving/deliveries/:id/lines", async (req: Request, res: Response) => {
  try {
    const parsed = putDeliveryLinesBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      return;
    }
    const data = await putDeliveryLines(req.params.id, parsed.data);
    res.json(data);
  } catch (err: unknown) {
    const m = mapReceivingError(err);
    if (m) {
      res.status(m.status).json(m.body);
      return;
    }
    const eng = mapStockEngineError(err);
    if (eng) {
      res.status(eng.status).json(eng.body);
      return;
    }
    const svc = mapServiceError(err);
    if (svc) {
      res.status(svc.status).json(svc.body);
      return;
    }
    req.log.error({ err }, "putDeliveryLines");
    res.status(500).json({ error: "Failed to save delivery lines" });
  }
});

router.post("/receiving/deliveries/:id/post", async (req: Request, res: Response) => {
  try {
    const parsed = postDeliveryBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      return;
    }
    const result = await postDelivery(req.params.id, parsed.data);
    res.status(result.idempotent ? 200 : 201).json(result);
  } catch (err: unknown) {
    const m = mapReceivingError(err);
    if (m) {
      res.status(m.status).json(m.body);
      return;
    }
    const eng = mapStockEngineError(err);
    if (eng) {
      res.status(eng.status).json(eng.body);
      return;
    }
    const svc = mapServiceError(err);
    if (svc) {
      res.status(svc.status).json(svc.body);
      return;
    }
    req.log.error({ err }, "postDelivery");
    res.status(500).json({ error: "Failed to post delivery" });
  }
});

router.get("/receiving/products/:productId/incoming", async (req: Request, res: Response) => {
  try {
    const data = await getProductIncoming(req.params.productId);
    res.json(data);
  } catch (err: unknown) {
    const m = mapReceivingError(err);
    if (m) {
      res.status(m.status).json(m.body);
      return;
    }
    req.log.error({ err }, "getProductIncoming");
    res.status(500).json({ error: "Failed to load incoming quantity" });
  }
});

export default router;
