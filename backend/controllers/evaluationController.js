import { callGemini } from "../services/geminiService.js";
import supabase from "../services/supabaseClient.js"; // Import Supabase

export const evaluateAndSaveSession = async (req, res) => {
  try {
    const { qaPairs, user_id, job_role } = req.body;

    if (!qaPairs || !user_id) {
      return res.status(400).json({ error: "Missing required data" });
    }

    // 1. Get Evaluation from Gemini
    const prompt = `
      You are a senior technical interviewer. Evaluate these Q&A pairs.
  
      Rules:
      - score MUST be a decimal number between 0 and 10 (e.g. 7.5)
      - Do NOT wrap output in markdown or code fences
      - Return ONLY raw JSON, nothing else
      
      Response format:
      {"score": 7.5, "feedback": "...", "improvements": ["...", "..."]}
      
      Q&A to evaluate:
      ${JSON.stringify(qaPairs)}
    `;

    const result = await callGemini(prompt);

    let parsed;
    try {
      // Step 1: strip markdown fences FIRST
      const clean = result.replace(/```json/g, "").replace(/```/g, "").trim();
      
      // Step 2: extract JSON object from cleaned string
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Gemini raw response:", result);
      return res.status(500).json({ error: "AI returned invalid format", raw: result });
    }

    // Step 3: clamp score strictly to 0–10
    const rawScore = parseFloat(parsed.score);
    const score = isNaN(rawScore) ? 0 : Math.min(10, Math.max(0, rawScore));

    // 4. Create the Interview Session
    const { data: session, error: sessionError } = await supabase
      .from("interview_sessions")
      .insert([{
        user_id,
        job_role: job_role || "Technical Role",
        score: Number(parsed.score) || 0,
        feedback: parsed.feedback || "",
        improvements: parsed.improvements || []
      }])
      .select()
      .single();

    if (sessionError) {
      console.error("SUPABASE SESSION ERROR:", sessionError); // 🚨 This is key
      throw sessionError;
    }

    // 5. Bulk Save the Q&A Pairs linked to this session
    const answersToSave = qaPairs.map((pair) => ({
      session_id: session.id,
      question: pair.question,
      answer: pair.answer
    }));

    const { error: answersError } = await supabase
      .from("interview_answers")
      .insert(answersToSave);

    if (answersError) throw answersError;

    // 6. Return the session data to the frontend
    res.json({
      sessionId: session.id,
      score: score,
      feedback: session.feedback,
      improvements: session.improvements
    });

  } catch (err) {
    console.error("EVALUATION & SAVE ERROR:", err);
    res.status(500).json({ error: "Failed to process interview results" });
  }
};