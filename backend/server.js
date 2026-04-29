import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { callGemini } from "./services/geminiService.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import answerRoutes from "./routes/answerRoutes.js";
import evaluationRoutes from "./routes/evaluationRoutes.js";
import historyRoutes from "./routes/historyRoutes.js";

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://algohack-interview.vercel.app'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

app.use("/api/resume", resumeRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/answers", answerRoutes);
app.use("/api/evaluation", evaluationRoutes);
app.use("/api/history", historyRoutes);

app.get("/", (req, res) => {
  res.send("API is running...");
});


app.get("/test-ai", async (req, res) => {
  try {
    const response = await callGemini("5 SDE interview questions only");
    res.send(response);
  } catch (err) {
    res.status(500).send(err.message);
  }
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on port 5000");
});

