import { Router } from "express";
import { getAllTransactions } from "../controllers/transactions.controller";

const router = Router();

router.get("/", getAllTransactions);

export default router;