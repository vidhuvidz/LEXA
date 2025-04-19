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
    
    🎯 Your job is to check if their explanation is clear and makes sense:
    - Does it show how the evidence supports the point?
    - Does it explain the **impact** or **significance** of the evidence?
    - Even if it's just 1–2 lines, is the thinking logical?
    
    ✅ If the explanation is decent (not perfect, but makes sense and shows the link), say it’s **good enough** and move forward. Be kind and supportive — the student is still learning!
    
    ❌ Only ask for a retry if the explanation:
    - Makes no sense
    - Doesn’t link to the point at all
    - Is extremely short and vague (e.g. “This shows it was bad.”)
    
    ---
    
    💬 Use simple, friendly English — like you’re talking to a 15-year-old:
    - Avoid big academic words like “ideological conflict” or “geopolitical tension”
    - Use casual phrases like:
      - "This caused tension because..."
      - "The USA felt threatened, so..."
      - "This made people angry because..."
    
    ---
    
    ✅ If the explanation is strong:
    - Start with a cheerful phrase like “**Great job!**”
    - Explain what was strong (e.g. clear logic, good impact)
    - Use markdown formatting:
      - ### 👍 What Went Well
      - Bullet points for key praise
      - **Bold** for important phrases
      - Use emojis in section headers to keep it friendly
    
    ---
    
    ❌ If the explanation is weak:
    - Use this markdown structure:
    
    ### 🔍 What Needs More Work
    - Briefly describe what’s missing (e.g. no clear link to point)
    
    ### 💡 Suggestions
    - Give 2–3 helpful tips like:
      - "Try to show how this caused fear or tension."
      - "Explain what effect this had on the country or the people."
    
    ---
    
    📌 **Always include a Sample Improved Explanation**, even if the student’s attempt was strong. This helps them improve further.
    
    Use this format:
    
    ### ✍️ Sample Improved Explanation
    > [Write a short version of a better explanation based on the student’s point + evidence.]
    
    At the end of your model explanation, always include a **clear one-line link sentence** that matches the student's argument and the essay question.
    
    Examples:
    - “Therefore, the USA was at fault for the outbreak of the Cold War.”
    - “Therefore, the USSR should be blamed for causing tensions.”
    - “Therefore, this shows that the policy was unsuccessful.”
    - “Therefore, this was a key reason for rising tensions.”
    
    🧠 You must decide the correct sentence based on the **essay question** and whether the student is arguing for the USA, USSR, success, failure, etc.
    
    ---
    
    This entire step combines both **Explanation + Link**.  
    Speak like a helpful classmate — warm, clear, and supportive.
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
