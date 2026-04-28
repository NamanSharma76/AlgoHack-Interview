import supabase from "../services/supabaseClient.js";

/**
 * GET /api/history/:user_id
 * Fetches the high-level list of all interview sessions for the main dashboard.
 */
export const getUserHistory = async (req, res) => {
  try {
    const { user_id } = req.params;

    const { data, error } = await supabase
      .from("interview_sessions")
      .select("id, job_role, score, created_at")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
};

/**
 * GET /api/history/session/:session_id
 * Fetches the full summary (score, feedback, improvements) for a specific session.
 */
export const getSessionSummary = async (req, res) => {
  try {
    const { session_id } = req.params;

    const { data, error } = await supabase
      .from("interview_sessions")
      .select("*")
      .eq("id", session_id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error fetching session summary:", err);
    res.status(500).json({ error: "Failed to fetch session summary" });
  }
};

/**
 * GET /api/history/answers/:session_id
 * Fetches the specific Q&A transcript associated with a session.
 */
export const getSessionAnswers = async (req, res) => {
  try {
    const { session_id } = req.params;

    const { data, error } = await supabase
      .from("interview_answers")
      .select("*")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true }); // Transcript should be in chronological order

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error fetching session details:", err);
    res.status(500).json({ error: "Failed to fetch session details" });
  }
};