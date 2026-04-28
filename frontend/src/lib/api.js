const BASE_URL = '${process.env.NEXT_PUBLIC_API_URL}';

export const saveAnswer = async ({ question, answer, user_id }) => {
  const res = await fetch(`${BASE_URL}/api/answers/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      answer,
      user_id,
    }),
  });

  return res.json();
};