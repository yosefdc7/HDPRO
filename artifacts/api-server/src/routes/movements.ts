import { CreateMovementBody } from "@workspace/api-zod";
import { db, movementsTable } from "@workspace/db";
import { Router, type Request, type Response } from "express";
import {
  createStockMovement,
  mapServiceError,
  mapStockEngineError,
} from "../services/stockMovementService";

const router = Router();

// Mock data fallback
const MOCK_MOVEMENTS = [
  { id: "sm1", type: "in", product_id: "p1", product_name: "Portland Cement", quantity: 200, unit: "bag", note: "Supplier delivery - Eagle Cement", by: "RJ", timestamp: "2026-04-04T08:30:00" },
  { id: "sm2", type: "out", product_id: "p2", product_name: "THHN Wire #12 Red", quantity: 50, unit: "meter", note: "Walk-in customer", by: "RJ", timestamp: "2026-04-04T09:15:00" },
  { id: "sm3", type: "adjustment", product_id: "p6", product_name: "Hollow Blocks 4\"", quantity: -15, unit: "piece", note: "Breakage write-off", by: "RJ", timestamp: "2026-04-03T14:00:00" }
];

router.get("/movements", async (req: Request, res: Response) => {
  if (process.env.USE_MOCK_DB === "true") {
    res.json(MOCK_MOVEMENTS);
    return;
  }
  try {
    const movements = await db.select().from(movementsTable);
    res.json(movements);
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to fetch movements");
    res.status(500).json({ error: "Failed to fetch movements" });
  }
});

router.post("/movements", async (req: Request, res: Response) => {
  if (process.env.USE_MOCK_DB === "true") {
    const newMovement = { ...req.body, id: `sm${Math.floor(Math.random() * 1000)}`, timestamp: new Date().toISOString() };
    res.status(201).json(newMovement);
    return;
  }
  try {
    const parsed = CreateMovementBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid movement data", issues: parsed.error.issues });
      return;
    }
    const { movement, status } = await createStockMovement(parsed.data);
    res.status(status).json(movement);
  } catch (err: unknown) {
    const engine = mapStockEngineError(err);
    if (engine) {
      res.status(engine.status).json(engine.body);
      return;
    }
    const svc = mapServiceError(err);
    if (svc) {
      res.status(svc.status).json(svc.body);
      return;
    }
    req.log.error({ err }, "Failed to record movement");
    res.status(500).json({ error: "Failed to record movement" });
  }
});

export default router;
