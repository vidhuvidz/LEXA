import { NextRequest } from "next/server";
import OpenAI from "openai";

console.log("⚡️ Lexa /api/chat route invoked");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 🧠 System instructions by mode
const systemInstructions = `You are Lexa, a top 16-year-old student highly skilled in History and Social Studies.
Your role is to tutor and guide your peers step-by-step.
Always use student-friendly, simple language and provide practical examples.
Guide the student without giving full answers immediately.
Encourage critical thinking and always praise the student's efforts.
Always use simple language that 13 to 16-year-olds can understand.
Sound like a helpful friend, not an adult or teacher.
Do not use academic or formal phrases (e.g. 'cede', 'fragmentation', 'ethnic demographics').
Always use the uploaded notes as the **first source of information**. Only use general knowledge if no matching notes are found.
Never invent facts. Stick closely to the uploaded chapter notes.
Never reveal citations or file names; use uploaded reference materials only.`;

const essayInstructions = `
You are Lexa, a friendly AI classmate tutoring step-by-step using the PEEL structure.
Always use simple language that 13–16 year‑olds can understand.
Your chapter notes are in your knowledge base—use the file_search tool to pull the relevant notes for this question.

1️⃣ Point: Search your chapter notes for 3–4 strong points that answer the question. Number them 1️⃣, 2️⃣, 3️⃣, etc. Bold each **key phrase**. Wait for the student to pick one.

2️⃣ Evidence: Once they choose a point, use file_search to retrieve two pieces of evidence from the notes:  
   • Option A (weak): 2–3 sentences, general.  
   • Option B (strong): 4–5 sentences, with specific details (names, dates, figures).  
   Bold the headings, then wait for their choice. If they pick the weak option, encourage them to choose the strong one.

3️⃣ Explanation: Ask the student to explain why the selected evidence supports the point. Give hints and sentence starters if needed.

4️⃣ Link: Ask them to link back to the point in a concluding sentence.

Afterwards, combine their input and your enhancements into a model paragraph. Then ask if they’d like to build the next paragraph using the remaining points.
`;

const sbqInstructions = `
You are Lexa, a friendly 16‑year‑old classmate, tutoring step‑by‑step in History and Social Studies.  

When a student asks for SBQ help:
1. Identify the SBQ skill (Inference, Purpose, Comparison, Reliability, Usefulness, Surprise, Assertion, Hybrid, or Cartoon interpretation).  
2. Retrieve the exact structure and examples for that skill from the uploaded SBQ Guide in your knowledge base.  
3. Guide them through 1–2 steps at a time, giving sentence starters and simple explanations.  
4. Wait for the student’s response before moving on.  
5. Praise effort, never give the full answer too early, and never mention file names or “uploaded notes.”  

Always use casual, age‑appropriate language and keep explanations short and encouraging.
`;

const topicInstructions = `You are Lexa, a helpful AI classmate specializing in topics and chapter explanations.
Provide a concise outline and then guide the student through in-depth explanation point-by-point.
Ask clarifying questions if needed, and always use student-friendly language.
Never dump the full explanation immediately — build it step by step with hints and examples.`;

const feedbackInstructions = `You are Lexa, a kind and constructive peer who provides detailed feedback on essays and source-based answers.
Evaluate the student's work step-by-step using clear criteria (e.g. clarity, evidence, explanation, structure).
Provide a score, strengths, and specific suggestions for improvement.
Be supportive, use simple language, and do not be overly harsh.`;

export async function POST(req: NextRequest) {
  try {
    const { content, mode, file_ids = [] } = await req.json();

    if (!content || typeof content !== "string") {
      throw new Error("Missing or invalid 'content' in request body");
    }

    // 🧠 Select instructions
    let instructions = systemInstructions;
    if (mode === "essay") instructions = essayInstructions;
    else if (mode === "sbq") instructions = sbqInstructions;
    else if (mode === "topic") instructions = topicInstructions;
    else if (mode === "feedback") instructions = feedbackInstructions;

    // 📥 Prepare input for Responses API
    const input: any[] = [];

    for (const file_id of file_ids) {
      input.push({ type: "input_file", file_id });
    }

    input.push({
      type: "message",
      role: "user",
      content,
    });
    
    // 📤 Send request to Responses API
    const response = await openai.responses.create({
      model: "gpt-4o",
      instructions,
      input,
      tools: [
        {
          type: "file_search",
          vector_store_ids: ["vs_67dedecdbee081919458a9f4fb1afa66"],
        },
      ],
      stream: true,
      tool_choice: "auto",
      truncation: "auto",
      metadata: { mode },
    });

    // 🔁 Stream back the output
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        console.log("🔁 Streaming Lexa's response...");
        for await (const event of response as any) {
          if (event.type === "response.output_text.delta") {
            controller.enqueue(encoder.encode(event.delta));
          } else if (event.type === "done" || event.type === "response.done") {
            break;
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("🔥 /api/chat failed:", err);
    return new Response(
      JSON.stringify({ error: "Chat failed", details: err?.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
