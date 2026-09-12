import { Router } from "express";
import {
  getAnalyticsSummary,
  getAnalyticsTrends,
  getAnalyticsCategories,
} from "../controllers/analytics.controller";

const router = Router();

router.get("/summary", getAnalyticsSummary);
router.get("/trends", getAnalyticsTrends);
router.get("/categories", getAnalyticsCategories);

export default router;