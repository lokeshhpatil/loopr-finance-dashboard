import { Router } from "express";
import { getMe, loginUser, logoutUser, refreshAccessToken, registerUser } from "../controllers/auth.controller";
import { verifyJWTMidd } from "../middleware/auth.middleware";

const router = Router();

router.post("/signup", registerUser);
router.post("/signin", loginUser);
router.post("/logout", verifyJWTMidd, logoutUser);
router.post("/refresh-token", refreshAccessToken);

router.get("/profile", verifyJWTMidd, getMe);

export default router;