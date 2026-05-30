import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import branchesRouter from "./branches";
import inventoryRouter from "./inventory";
import movementsRouter from "./movements";
import auditRouter from "./audit";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import seedRouter from "./seed";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(branchesRouter);
router.use(inventoryRouter);
router.use(movementsRouter);
router.use(auditRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(seedRouter);
router.use(notificationsRouter);

export default router;
