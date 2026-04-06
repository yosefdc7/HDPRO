import { Router, type Request, type Response } from "express";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
// We use the generated Zod schemas to validate incoming POST bodies if needed

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
    const newProduct = await db.insert(productsTable).values(req.body).returning();
    res.status(201).json(newProduct[0]);
  } catch (err: any) {
    req.log.error({ err }, "Failed to create product");
    res.status(400).json({ error: "Invalid product data" });
  }
});

export default router;
