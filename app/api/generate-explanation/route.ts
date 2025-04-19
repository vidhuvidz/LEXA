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
    - Use markdown with:
      - Headings (e.g. ### 👍 What Went Well)
      - Bullet points
      - **Bold** for key ideas
      - ✅ Emoji headers for sections
    
    ---
    
    ❌ If the explanation is unclear or weak:
    Use the following markdown structure in your response:
    
    ### 🔍 What Needs More Work
    - Explain briefly why the explanation is weak (e.g. vague, no link to point, no impact shown)
    
    ### 💡 Suggestions
    - Give 2–3 simple, friendly tips (e.g. “Try to show the result of this action” or “Explain why this was important to the topic”)
    
    ### ✍️ Sample Improved Explanation
    Use a **blockquote** to give an improved sentence based on their point + evidence.
    
    End your reply with something encouraging like:
    "👍 Give it another shot — I’ll check it again!"
    
    Speak like a helpful classmate. Avoid technical terms or robotic tone. Keep it clear, supportive, and easy to follow.
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
