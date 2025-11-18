import express from "express";
import { getProfile, updateProfile } from "../controllers/profile.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, getProfile);
router.post("/update", authMiddleware, updateProfile);

export default router;
