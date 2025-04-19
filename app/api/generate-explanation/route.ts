import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const vectorStoreId = "vs_67dedecdbee081919458a9f4fb1afa66";

export async function POST(req: NextRequest) {
  const { explanation, point, evidence, file_ids } = await req.json();

  try {
    const vectorStoreIds = [
      vectorStoreId,
      ...(Array.isArray(file_ids) ? file_ids : []),
    ];

    const instructions = `
You are Lexa, a kind and smart 16-year-old helping a classmate with their History PEEL essay.

The student has just written an **Explanation** to connect their chosen Evidence to the main Point in a PEEL paragraph.

---

🎯 Your job is to give helpful, structured feedback on just the **Explanation** step. You must help the student understand whether:
- Their explanation clearly links the evidence to the point
- It shows the **impact or significance** of the evidence
- It logically explains **why** the evidence supports the point

---

✅ If the explanation is strong:
- Start with a cheerful phrase like "**Great job!**"
- Briefly explain what made it good (clarity, logic, impact)
- Format the response using markdown:
  - Headings (e.g. ### 👍 What Went Well)
  - Bullet points
  - **Bold** for emphasis
  - ✅ Emoji headers

---

❌ If the explanation is unclear or weak:
Use the following structure in your response:

### 🔍 What Needs More Work
- Briefly describe the weakness (e.g. vague, too short, doesn’t show impact)

### 💡 Suggestions
- Give 2–3 simple, student-friendly tips (e.g. “Try to show how this affected people,” or “Explain why this event was important”)

### ✍️ Sample Improved Explanation
> Give a short example sentence that links the same evidence to the point. Use only what the student provided.

Always end with encouragement, like:
"👍 Try again! I'll give feedback after your next attempt."

Keep the tone warm, simple, and encouraging — like a helpful classmate. Avoid technical jargon or robotic responses.
`;



    const response = await openai.responses.create({
      model: "gpt-4o",
      instructions,
      input: [
        {
          type: "message",
          role: "user",
          content: `Here is my PEEL paragraph so far:
          
**Point**: ${point}
**Evidence**: ${evidence}
**Explanation**: ${explanation}

Please evaluate the explanation. Is it strong and logical? How can I improve it?`,
        },
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: vectorStoreIds,
        },
      ],
      tool_choice: "auto",
    });

    const feedback = (response as any).output_text?.trim();
if (!feedback) {
  return NextResponse.json({
    feedback: "⚠️ Lexa couldn’t give feedback. Try writing a bit more, or rephrase your explanation.",
    nextStep: "explanation",
  });
}


    const nextStep = feedback.toLowerCase().includes("great job") ||
      feedback.toLowerCase().includes("strong explanation")
      ? "link"
      : "explanation";

    return NextResponse.json({ feedback, nextStep });
  } catch (error) {
    console.error("❌ Error in generate-explanation:", error);
    return NextResponse.json({ feedback: "⚠️ Internal error.", nextStep: "explanation" }, { status: 500 });
  }
}
