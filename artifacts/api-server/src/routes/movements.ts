import { Router, type Request, type Response } from "express";
import { db, movementsTable } from "@workspace/db";

const router = Router();

router.get("/movements", async (req: Request, res: Response) => {
  try {
    const movements = await db.select().from(movementsTable);
    res.json(movements);
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch movements");
    res.status(500).json({ error: "Failed to fetch movements" });
  }
});

router.post("/movements", async (req: Request, res: Response) => {
  try {
    // In our offline architecture, the mobile app sends an exact `capturedAt` timestamp.
    // Future Phase 3 Step: check versions here for conflicts.
    const newMovement = await db.insert(movementsTable).values(req.body).returning();
    res.status(201).json(newMovement[0]);
  } catch (err: any) {
    req.log.error({ err }, "Failed to record movement");
    res.status(400).json({ error: "Invalid movement data" });
  }
});

export default router;
