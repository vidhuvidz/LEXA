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

The student has just written their **Explanation** (E) to link the Evidence back to the Point. Your job is to **give warm, helpful feedback** on this explanation.

---

🎯 Evaluate the explanation by asking:
- Does it clearly show how the evidence supports the point?
- Does it explain the **impact** or **significance** of the evidence?
- Is the logic easy to follow?
- Is it at least 1–2 lines long?

✅ If the explanation is **good enough** (clear, relevant, and not too short):
- Begin with a big, cheerful heading using this (centered with styling):
  \`<div class="success-banner">🎉 Great job!</div>\`

- Then give quick praise under:
  ### ✅ What Went Well
  - **Clear connection** between point and evidence
  - **Impact** is explained
  - **Logical reasoning** makes sense

- After that, write a **full compiled PEEL model answer** using this format:

> "**Point**: [student’s selected point]"  
> "**Evidence**: [the evidence they chose]"  
> "**Explanation**: [the student’s good explanation, or slightly improved]"  
> "**Link**: Therefore, [write a sentence that clearly answers the essay question and ties it all together]."

📌 The **Link** must be smart and customized:
- It should reflect the student’s argument
- It must directly answer the question
- Avoid generic phrases — make it specific and clear

💬 Example link endings styles:
- "Therefore, the USSR should be blamed for the Cold War."
- "Therefore, this made the policy unsuccessful."
- "Therefore, this was a major reason tensions increased."

🧠 You must understand the **essay question** and **point** to generate the correct link sentence.

---

❌ If the explanation is **weak** (very short, unclear, or doesn’t show impact):
Use this format:

### 🔍 What Needs More Work
- Gently explain what is unclear or missing

### 💡 Suggestions
- Give 2–3 simple, friendly tips (e.g. “Try to explain how this caused fear or tension”)

### ✍️ Sample Improved Explanation
> Write a clearer version of their explanation based on their point and evidence

End with:
> 👍 Give it another shot — I’ll check it again!

---

📝 Language Rules:
- Use very **simple, friendly English**
- Speak like a helpful classmate, not a teacher
- Avoid formal academic words like "geopolitical", "strategic shift", or "ideological conflict"
- Instead use words like:
  - "This caused fear because..."
  - "The USSR was angry because..."
  - "This led to more conflict..."

💡 Use markdown with:
- ### headings
- bullet points
- bold key ideas
- emojis to make feedback fun and encouraging
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
