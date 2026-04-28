import { callGemini } from "../services/geminiService.js";

export const generateQuestions = async (req, res) => {
  try {
    const { parsedResume, jobDescription } = req.body;

    if (!parsedResume || !jobDescription) {
      return res.status(400).json({
        error: "Parsed resume and job description are required"
      });
    }

    const prompt = `
You are a Senior Technical Interviewer.

Candidate Resume:
${JSON.stringify(parsedResume)}

Job Description:
${jobDescription}

Generate 5 HIGH-QUALITY interview questions:

Rules:
- 2 conceptual questions
- 2 practical/scenario-based questions
- 1 tricky follow-up question
- Match difficulty with candidate level
- Avoid generic textbook questions

Return ONLY valid JSON:
{
  "questions": [
    "Question 1",
    "Question 2",
    "Question 3",
    "Question 4",
    "Question 5"
  ]
}
`;

    const response = await callGemini(prompt);

    // ✅ SAME parsing logic (reuse)
    let parsedData;

    try {
      const cleanText = response
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      parsedData = JSON.parse(cleanText);
    } catch (err) {
      console.error("JSON Parse Error:", err);
      return res.status(500).json({
        error: "Failed to parse AI response",
        raw: response
      });
    }

    res.json(parsedData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate questions" });
  }
};