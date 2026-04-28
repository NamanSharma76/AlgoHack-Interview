import express from "express";
import { 
  getUserHistory, 
  getSessionSummary, // New
  getSessionAnswers  // New
} from "../controllers/historyController.js";

const router = express.Router();

router.get("/:user_id", getUserHistory);
router.get("/session/:session_id", getSessionSummary);
router.get("/answers/:session_id", getSessionAnswers);

export default router;