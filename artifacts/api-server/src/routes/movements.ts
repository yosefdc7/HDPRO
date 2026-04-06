import { CreateMovementBody } from "@workspace/api-zod";
import { db, movementsTable } from "@workspace/db";
import { Router, type Request, type Response } from "express";
import {
  createStockMovement,
  mapServiceError,
  mapStockEngineError,
} from "../services/stockMovementService";

const router = Router();

router.get("/movements", async (req: Request, res: Response) => {
  try {
    const movements = await db.select().from(movementsTable);
    res.json(movements);
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to fetch movements");
    res.status(500).json({ error: "Failed to fetch movements" });
  }
});

router.post("/movements", async (req: Request, res: Response) => {
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
