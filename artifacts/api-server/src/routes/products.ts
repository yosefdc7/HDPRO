import { Router, type Request, type Response } from "express";
import { db, insertProductSchema, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// Mock data fallback
const MOCK_PRODUCTS = [
  { id: "p1", category_id: "c1", name: "Portland Cement", sku: "CEM-001", barcode: "8850001001234", primary_unit: "bag", stock_quantity: 145, incoming_quantity: 60, supplier_id: "s1", reorder_level: 50, cost_price: 220, selling_price: 265, is_active: true, image_placeholder: "🏗️", notes: "Pallet stock near loading bay. Watch for torn bags and moisture." },
  { id: "p2", category_id: "c2", name: "THHN Wire #12 Red", sku: "WIR-012R", barcode: "8850001001235", primary_unit: "meter", stock_quantity: 2400, incoming_quantity: 300, supplier_id: "s2", reorder_level: 500, cost_price: 8, selling_price: 12, is_active: true, image_placeholder: "⚡" },
  { id: "p3", category_id: "c3", name: "Coco Lumber 2x2x8", sku: "LUM-228", barcode: "8850001001236", primary_unit: "piece", stock_quantity: 85, reorder_level: 30, cost_price: 45, selling_price: 65, is_active: true, image_placeholder: "🪵" },
  { id: "p4", category_id: "c4", name: "Boysen Latex White 4L", sku: "PNT-BLW4", barcode: "8850001001237", primary_unit: "gallon", stock_quantity: 32, reorder_level: 10, cost_price: 380, selling_price: 485, is_active: true, image_placeholder: "🎨", demand_risk_profile: "seasonal", supplier_lead_time_days: 10 },
  { id: "p5", category_id: "c5", name: "GI Pipe 1/2\" S40", sku: "PLM-GIP12", barcode: "8850001001238", primary_unit: "piece", stock_quantity: 60, reorder_level: 20, cost_price: 185, selling_price: 245, is_active: true, image_placeholder: "🔧" }
];

router.get("/products", async (req: Request, res: Response) => {
  if (process.env.USE_MOCK_DB === "true") {
    res.json(MOCK_PRODUCTS);
    return;
  }
  try {
    const products = await db.select().from(productsTable);
    res.json(products);
  } catch (err: any) {
    req.log.error({ err }, "Failed to fetch products");
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/products", async (req: Request, res: Response) => {
  if (process.env.USE_MOCK_DB === "true") {
    const newProduct = { ...req.body, id: `p${Math.floor(Math.random() * 1000)}` };
    res.status(201).json(newProduct);
    return;
  }
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
