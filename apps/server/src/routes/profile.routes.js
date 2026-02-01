import express from "express";
import { getProfile, updateProfile, uploadProfilePicture } from "../controllers/profile.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.get("/", authMiddleware, getProfile);
router.post("/update", authMiddleware, updateProfile);
router.post("/avatar", authMiddleware, upload.single("image"), uploadProfilePicture);

export default router;
