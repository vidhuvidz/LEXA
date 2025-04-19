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

Only focus on checking if the student's explanation connects the evidence to the point.
- If it's strong: praise it and explain why it's good.
- If it's weak: give supportive, helpful suggestions and offer a better sentence or guiding question.
Do NOT rewrite the full paragraph — only help with the explanation step.

Be warm, student-friendly, and use markdown formatting.
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
