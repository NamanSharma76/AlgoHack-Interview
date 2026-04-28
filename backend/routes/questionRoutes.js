import express from "express";
import { generateQuestions } from "../controllers/questionController.js";

const router = express.Router();

router.post("/generate", generateQuestions);

export default router;