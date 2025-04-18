export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VECTOR_STORE_ID = "vs_67dedecdbee081919458a9f4fb1afa66";

export async function POST(req: NextRequest) {
  try {
    const { point, question } = await req.json();

    if (!point || typeof point !== "string" || !question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'point' or 'question' in request body" },
        { status: 400 }
      );
    }

    const instructions = `You are Lexa, an AI history tutor. Using ONLY the uploaded notes in the vector store, provide two types of evidence for this PEEL point based on the student's essay question.

Essay Question: "${question}"
Selected PEEL Point: "${point}"

🔸 Weak Evidence (Option A): 2–3 lines of general evidence  
🔹 Strong Evidence (Option B): 4–5 lines of detailed evidence with specific facts, names, dates, or statistics.

Only use information from the uploaded notes. Do NOT invent or hallucinate anything. Format clearly.`

    const response = await openai.responses.create({
      model: "gpt-4o",
      instructions,
      input: [
        {
          type: "message",
          role: "user",
          content: `Essay question: ${question}\nSelected PEEL point: ${point}`,
        },
      ],
      tools: [
        {
          type: "file_search",
          vector_store_ids: [VECTOR_STORE_ID],
        },
      ],
      tool_choice: "auto",
      stream: false,
    });

    const rawText = (response as any).output_text || "";
    // … after you get `rawText` from OpenAI …

    // … after you log rawText …

// Simple marker parse instead of regex
const raw = rawText;
const weakMarker = "🔸";
const strongMarker = "🔹";

const weakStart = raw.indexOf(weakMarker);
const strongStart = raw.indexOf(strongMarker);

let weak = "";
let strong = "";

if (weakStart !== -1 && strongStart !== -1) {
  // Find the first colon after 🔸
  const weakColon = raw.indexOf(":", weakStart);
  // Grab everything between that colon + 1 and just before 🔹
  weak = raw.slice(weakColon + 1, strongStart).trim();
  
  // Now for strong
  const strongColon = raw.indexOf(":", strongStart);
  // Everything after that colon is strong evidence
  strong = raw.slice(strongColon + 1).trim();
}

// Log to confirm
console.log("✅ Parsed Weak Evidence:", weak);
console.log("✅ Parsed Strong Evidence:", strong);

return NextResponse.json({
  weak,
  strong,
});

  } catch (err) {
    console.error("[generate-evidence] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
