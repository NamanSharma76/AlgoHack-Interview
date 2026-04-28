import supabase from "../services/supabaseClient.js";

export const saveAnswer = async (req, res) => {
  try {
    const { question, answer, session_id } = req.body;

    if (!question || !answer || !user_id) {
      return res.status(400).json({ error: "Missing data" });
    }

    const { data, error } = await supabase
      .from("interview_answers")
      .insert([{ question, answer, session_id }]);

    if (error) throw error;

    res.json({ message: "Saved successfully", data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save answer" });
  }
};