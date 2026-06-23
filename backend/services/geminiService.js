import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const callGemini = async (prompt) => {
  try {
    // Attempt 1: Speed (Groq)
    const groq = new Groq();
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
    });
    
    return response.choices[0].message.content;

  } catch (groqError) {
    console.warn("Groq failed or overloaded. Falling back to Gemini...", groqError.message);

    // Attempt 2: Heavy Lifter (Gemini)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    
    return result.response.text();
  }
};