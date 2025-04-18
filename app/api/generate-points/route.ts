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

    const instructions = `You are Lexa, a top history student and tutor. Using ONLY the uploaded chapter notes and any PDFs the student just provided (via file search), suggest 2–3 strong main points that could answer this essay question:\n"${question}"\n\nFormat:\n- Use bullet points\n- Bold the key phrase at the start of each point (e.g., "**Economic hardship**: …")\n- Each point should be a short sentence (under 30 words)\n\nDo NOT explain the full argument. Do NOT include citations or filenames.`;

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
