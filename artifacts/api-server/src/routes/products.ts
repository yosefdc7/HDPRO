import { Router, type Request, type Response } from "express";
import { db, insertProductSchema, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/products", async (req: Request, res: Response) => {
  try {
    const products = await db.select().from(productsTable);
    res.json(products);
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch products");
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/products", async (req: Request, res: Response) => {
  try {
    const parsed = insertProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid product data", issues: parsed.error.issues });
      return;
    }
    const newProduct = await db.insert(productsTable).values(parsed.data).returning();
    res.status(201).json(newProduct[0]);
  } catch (err: any) {
    req.log.error({ err }, "Failed to create product");
    res.status(400).json({ error: "Invalid product data" });
  }
});

export default router;
