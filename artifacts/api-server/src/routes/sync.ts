import { CreateMovementBody } from "@workspace/api-zod";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import {
  createStockMovement,
  mapServiceError,
  mapStockEngineError,
} from "../services/stockMovementService";

const router = Router();

const syncPushBodySchema = z.array(
  z.object({
    id: z.string().uuid(),
    entity: z.enum(["product", "movement"]),
    action: z.enum(["create", "update"]),
    payload: z.record(z.unknown()),
    capturedAt: z.coerce.date(),
  }),
);

router.post("/sync/push", async (req: Request, res: Response) => {
  const parsedBody = syncPushBodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    res.status(400).json({ error: "Invalid sync payload", issues: parsedBody.error.issues });
    return;
  }

  const results: {
    id: string;
    status: "success" | "conflict" | "error";
    serverTimestamp?: string;
  }[] = [];

  const nowIso = new Date().toISOString();

  for (const item of parsedBody.data) {
    if (item.entity !== "movement" || item.action !== "create") {
      results.push({
        id: item.id,
        status: "error",
        serverTimestamp: nowIso,
      });
      continue;
    }

    const merged = {
      ...item.payload,
      id: item.id,
      capturedAt: item.capturedAt,
    };
    const movementParsed = CreateMovementBody.safeParse(merged);
    if (!movementParsed.success) {
      results.push({
        id: item.id,
        status: "error",
        serverTimestamp: nowIso,
      });
      continue;
    }

    try {
      await createStockMovement(movementParsed.data);
      results.push({
        id: item.id,
        status: "success",
        serverTimestamp: nowIso,
      });
    } catch (err: unknown) {
      const engine = mapStockEngineError(err);
      if (engine?.status === 409) {
        results.push({
          id: item.id,
          status: "conflict",
          serverTimestamp: nowIso,
        });
        continue;
      }
      const svc = mapServiceError(err);
      if (svc?.status === 404 || svc?.status === 400) {
        results.push({
          id: item.id,
          status: "error",
          serverTimestamp: nowIso,
        });
        continue;
      }
      req.log.error({ err, syncId: item.id }, "Sync push failed for movement");
      results.push({
        id: item.id,
        status: "error",
        serverTimestamp: nowIso,
      });
    }
  }

  res.json(results);
});

export default router;
