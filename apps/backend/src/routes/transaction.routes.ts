import { Router } from "express";
import { getTransactions } from "../controllers/transactions.controller";

const router = Router();

router.get("/", getTransactions);

export default router;