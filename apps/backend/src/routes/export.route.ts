import { Router } from "express";
import { exportTransactions } from "../controllers/export.controller";
import { verifyJWTMidd } from "../middleware/auth.middleware";

const router = Router();

router.use(verifyJWTMidd);
router.get("/transactions", exportTransactions);

export default router;