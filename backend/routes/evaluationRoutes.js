import express from "express";
// Update the name here inside the curly braces
import { evaluateAndSaveSession } from "../controllers/evaluationController.js";

const router = express.Router();

// Update the function name here too
router.post("/evaluate", evaluateAndSaveSession);

export default router;