import express from "express";
import { parseResume, parseResumeFile, upload } from "../controllers/resumeController.js";

const router = express.Router();

// Existing: parse from plain text body
router.post("/parse", parseResume);

// New: parse from uploaded file (PDF / Word / txt)
router.post("/parse-file", upload.single("resume"), parseResumeFile);

export default router;