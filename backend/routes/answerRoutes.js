import express from "express";
import { saveAnswer } from "../controllers/answerController.js";

const router = express.Router();

router.post("/save", saveAnswer);

export default router;