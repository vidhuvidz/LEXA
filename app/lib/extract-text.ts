// app/lib/extract-text.ts
import { createWorker } from "tesseract.js";
import pdf from "pdf-parse";
import mammoth from "mammoth";

// Add this interface
export interface FileProcessingInput {
  path: string;
  buffer: Buffer;
  mimetype?: string;
}

// Add this export
export const processFile = async (file: FileProcessingInput) => {
  try {
    if (!file.mimetype) {
      throw new Error("File type could not be determined");
    }

    if (file.mimetype.startsWith("image/")) {
      const text = await extractWithTesseract(file.path);
      const preview = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
      return { text, type: 'image', preview };
    }

    if (file.mimetype === "application/pdf") {
      const text = await extractPDFText(file.buffer);
      return { text, type: 'pdf' };
    }

    if (file.mimetype.includes("wordprocessingml.document")) {
      const text = await extractDOCXText(file.buffer);
      return { text, type: 'docx' };
    }

    return { text: file.buffer.toString("utf-8"), type: 'text' };
  } catch (error) {
    console.error("File processing error:", error);
    throw error;
  }
};

// Helper functions (make sure these are defined)
async function extractWithTesseract(imagePath: string): Promise<string> {
  const worker = await createWorker();
  try {
    await worker.load();
    await worker.initialize('eng');
    const { data } = await worker.recognize(imagePath);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

async function extractPDFText(buffer: Buffer): Promise<string> {
  const data = await pdf(buffer);
  return data.text;
}

async function extractDOCXText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}