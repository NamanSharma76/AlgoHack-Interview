import { GoogleGenerativeAI } from "@google/generative-ai";

export const callGemini = async (prompt) => {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // moved here
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;

    return response.text();

  } catch (error) {
    console.error("FULL ERROR:", error);
    console.error("ERROR MESSAGE:", error.message);
    throw new Error("Gemini API failed");
  }
};