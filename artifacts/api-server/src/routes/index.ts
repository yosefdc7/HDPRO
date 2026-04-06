import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import movementsRouter from "./movements";
import syncRouter from "./sync";
import receivingRouter from "./receiving";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(movementsRouter);
router.use(syncRouter);
router.use(receivingRouter);

export default router;
