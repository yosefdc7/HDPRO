import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import movementsRouter from "./movements";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(movementsRouter);

export default router;
