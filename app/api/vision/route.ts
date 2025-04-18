import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { base64, mimeType, userText } = await req.json();

    if (!base64 || !mimeType) {
      return new Response(JSON.stringify({ error: "Missing image data" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Use Lexa's friendly tone and consider the user's typed question
    const promptText = userText?.trim()
      ? `You're Lexa, a friendly 16-year-old history classmate. A friend just asked: "${userText}". Try to help them using what you can see in the image. If it's a cartoon or source, describe the message and who it is targeting.`
      : `You're Lexa, a friendly 16-year-old history classmate. A friend uploaded this image but didn’t say anything. Try to figure out what it is — a cartoon, flyer, or poster — and summarise it in a helpful way.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: promptText,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 800,
    });

    const result =
      response.choices?.[0]?.message?.content ||
      "Sorry, I couldn't analyze the image.";

    return new Response(result, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("🔥 Vision route error:", err);

    return new Response(
      JSON.stringify({
        error: "Vision analysis failed",
        details: err?.message || "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
