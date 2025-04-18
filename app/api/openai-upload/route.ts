import { NextResponse } from "next/server";
import { Readable } from "stream";
import { Buffer } from "buffer";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file found in formData" }, { status: 400 });
    }

    // ❌ Reject anything that is not a PDF
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = Readable.from(buffer);

    const form = new FormData();
    form.append("file", new Blob([buffer], { type: file.type }), file.name);
    form.append("purpose", "user_data");

    const openaiRes = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
    });

    if (!openaiRes.ok) {
      throw new Error(
        `OpenAI file upload error: ${openaiRes.status} ${openaiRes.statusText}`
      );
    }

    const data = await openaiRes.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("🔥 File upload to OpenAI failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
