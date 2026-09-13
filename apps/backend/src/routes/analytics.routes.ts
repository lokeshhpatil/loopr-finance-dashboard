import { Router } from "express";
import {
  getAnalyticsSummary,
  getAnalyticsTrends,
  getAnalyticsCategories,
} from "../controllers/analytics.controller";
import { verifyJWTMidd } from "../middleware/auth.middleware";

const router = Router();

router.use(verifyJWTMidd);
router.get("/summary", getAnalyticsSummary);
router.get("/trends", getAnalyticsTrends);
router.get("/categories", getAnalyticsCategories);

export default router;