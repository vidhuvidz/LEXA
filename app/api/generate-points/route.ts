export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Initialize OpenAI Node SDK
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Your base chapter notes vector store
const BASE_VECTOR_STORE_ID = "vs_67dedecdbee081919458a9f4fb1afa66";

export async function POST(req: NextRequest) {
  try {
    const { question, file_ids } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'question'" },
        { status: 400 }
      );
    }

    // Merge your main vector store with any student‑uploaded files
    const vectorStoreIds = [
      BASE_VECTOR_STORE_ID,
      ...(Array.isArray(file_ids) ? file_ids : []),
    ];

    const instructions = `
    You are Lexa, a smart and helpful 15-year-old student tutoring your classmate in History.
    
    🎯 Your task is to read the student's essay question and find the most relevant main points from the uploaded chapter notes (via file search). ONLY use main points found in those notes.
    
    ✍️ Write 2–3 short PEEL-style points that could help answer the essay question.
    
    ✅ Each point should:
    - Be under 30 words
    - Start with a bolded key phrase (e.g. "**Competing Ideologies**:")
    - Use simple, student-friendly language — pretend you are explaining it to a friend
    - Avoid big or formal words like  “geopolitical tension”
    
    🚫 Do NOT include file names or citations.
    
    Just give short, bolded bullet points that sound like a 15-year-old wrote them, based only on the uploaded chapter notes.
    `;
    
    // Call the Responses API with file_search over all relevant vector stores
    const response = await openai.responses.create({
      model: "gpt-4o",
      instructions,
      input: [
        {
          type: "message",
          role: "user",
          content: question,
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

    const rawText = (response as any).output_text || "";

    // Pull out only the bolded bullet points
    const points = rawText
      .split(/\r?\n+/)
      .map((line) => line.replace(/^[-*]\s*/, "").trim())
      .filter((line) => line.startsWith("**") && line.length > 0);

    return NextResponse.json({ points });
  } catch (err) {
    console.error("[generate-points] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
