import { callGemini } from "../services/geminiService.js";
import multer from "multer";
import mammoth from "mammoth";

import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// ── Multer: store file in memory (no disk writes) ─────────────────────────────
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, Word (.docx), or plain text files are allowed"));
    }
  },
});

// ── Extract raw text from uploaded buffer ─────────────────────────────────────
async function extractText(buffer, mimetype) {
  if (mimetype === "application/pdf") {
    const uint8Array = new Uint8Array(buffer);
    const pdf = await getDocument({ data: uint8Array }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }
    return text;
  }
  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimetype === "application/msword"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (mimetype === "text/plain") {
    return buffer.toString("utf-8");
  }
  throw new Error("Unsupported file type");
}

// ── Shared Gemini parsing logic ───────────────────────────────────────────────
async function parseWithGemini(resumeText) {
  const prompt = `
Extract structured information from this resume.

Return STRICT JSON only (no markdown, no explanation, no code fences):
{
  "name": "string",
  "skills": ["skill1", "skill2"],
  "projects": ["project1"],
  "experience": ["experience1"],
  "level": "beginner/intermediate/advanced"
}

Resume:
${resumeText}
`;
  const response = await callGemini(prompt);
  const clean = response.replace(/```json/g, "").replace(/```/g, "").trim();
  const jsonMatch = clean.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Gemini response");
  return JSON.parse(jsonMatch[0]);
}

// ── Route 1: Parse from plain text (existing) ─────────────────────────────────
export const parseResume = async (req, res) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText) {
      return res.status(400).json({ error: "Resume text is required" });
    }
    const parsedData = await parseWithGemini(resumeText);
    res.json({ parsed: parsedData });
  } catch (err) {
    console.error("parseResume error:", err);
    res.status(500).json({ error: "Failed to parse resume" });
  }
};

// ── Route 2: Parse from uploaded file (new) ───────────────────────────────────
export const parseResumeFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const rawText = await extractText(req.file.buffer, req.file.mimetype);
    if (!rawText || rawText.trim().length < 50) {
      return res.status(400).json({
        error: "Could not extract enough text from the file. Try pasting text instead.",
      });
    }
    const parsedData = await parseWithGemini(rawText);
    res.json({ parsed: parsedData, rawText });
  } catch (err) {
    console.error("parseResumeFile error:", err);
    res.status(500).json({ error: err.message || "Failed to parse resume file" });
  }
};