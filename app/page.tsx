// app/page.tsx
"use client";

import { useState } from "react";
import { Paperclip, Loader2, Send, BookOpen, MessageSquareText, FileText, Star, X } from "lucide-react";
import "./globals.css";

const STEPS = ["init", "question", "point", "evidence", "explanation", "link", "done"] as const;
type EssayStep = typeof STEPS[number];

type Msg = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [essayStep, setEssayStep] = useState<EssayStep>("init");
  const [essayQuestion, setEssayQuestion] = useState("");
  const [essayPoints, setEssayPoints] = useState<string[]>([]);
  const [selectedPoint, setSelectedPoint] = useState("");
  const [evidence, setEvidence] = useState<{ optionA: string; optionB: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  const pushUser = (text: string) => setMessages((m) => [...m, { role: "user", content: text }]);
  const pushAssistant = (text: string) => setMessages((m) => [...m, { role: "assistant", content: text }]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== "application/pdf") {
      alert("❌ Only PDF files are supported.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/openai-upload", { method: "POST", body: form });
      const json = await res.json();
      setFileIds((prev) => [...prev, json.id]);
      setFileNames((prev) => [...prev, file.name]);
      pushAssistant(`📎 PDF uploaded: ${file.name}`);
    } catch {
      alert("Upload failed.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const generatePoints = async () => {
    pushUser(`Essay question: ${essayQuestion}`);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: essayQuestion, file_ids: fileIds }),
      });
      const data = await res.json();
      setEssayPoints(data.points || []);
      data.points?.forEach((p: string, i: number) => pushAssistant(`${i + 1}. **${p}**`));
      setEssayStep("point");
    } catch {
      alert("Failed to generate points.");
    } finally {
      setLoading(false);
    }
  };

  const generateEvidence = async (point: string) => {
    pushUser(`Point selected: ${point}`);
    setSelectedPoint(point);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayQuestion, selectedPoint: point, file_ids: fileIds }),
      });
      const data = await res.json();
      setEvidence(data.evidence);
      pushAssistant(`🔸 **Option A (Weak):** ${data.evidence.optionA}`);
      pushAssistant(`🔹 **Option B (Strong):** ${data.evidence.optionB}`);
      setEssayStep("evidence");
    } catch {
      alert("Failed to generate evidence.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    pushUser(input);
    setInput("");
  };

  return (
    <main className="min-h-screen font-[Inter] bg-gray-50">
      <header className="bg-blue-600 text-white py-4 px-6 text-center">
        <h1 className="text-3xl font-bold tracking-wide">LEXA</h1>
        <p className="text-sm mt-1">Your AI Study Buddy</p>
      </header>

      <div className="flex h-[calc(100vh-100px)]">
        <div className="w-1/4 bg-gray-100 p-4 space-y-4 overflow-y-auto border-r">
          <button onClick={() => setEssayStep("question")} className="flex items-center gap-2 w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md">
            <BookOpen className="w-5 h-5" /> Essay Help
          </button>
          <button className="flex items-center gap-2 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md">
            <MessageSquareText className="w-5 h-5" /> SBQ Help
          </button>
          <button className="flex items-center gap-2 w-full bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded-md">
            <FileText className="w-5 h-5" /> Topic Guide
          </button>
          <button className="flex items-center gap-2 w-full bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-md">
            <Star className="w-5 h-5" /> Feedback
          </button>

          {essayStep === "question" && (
            <div className="mt-4 space-y-2">
              <label className="font-semibold block">Essay Question</label>
              <textarea
                rows={3}
                className="w-full border rounded p-2 text-sm"
                value={essayQuestion}
                onChange={(e) => setEssayQuestion(e.target.value)}
              />
              <input type="file" accept=".pdf" onChange={handleFileUpload} />
              <div className="space-y-1">
                {fileNames.map((name, idx) => (
                  <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                    📄 {name}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => {
                      setFileIds(fileIds.filter((_, i) => i !== idx));
                      setFileNames(fileNames.filter((_, i) => i !== idx));
                    }} />
                  </div>
                ))}
              </div>
              <button
                onClick={generatePoints}
                disabled={!essayQuestion.trim() || loading}
                className="w-full bg-blue-500 text-white py-2 rounded-md mt-2 disabled:opacity-50"
              >Generate Points</button>
            </div>
          )}

          {essayStep === "point" && (
            <div className="mt-4">
              <p className="font-semibold mb-2">Select a Point:</p>
              <div className="space-y-2">
                {essayPoints.map((pt, idx) => (
                  <button
                    key={idx}
                    onClick={() => generateEvidence(pt)}
                    className="w-full text-left bg-white border rounded p-2 hover:bg-blue-100 text-sm"
                  >{pt}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="w-3/4 flex flex-col justify-between">
          <div className="flex-1 p-6 overflow-y-auto">
            {messages.map((m, i) => (
              <div key={i} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
                <p className={m.role === "assistant" ? "bg-gray-100 inline-block px-4 py-2 rounded-md" : "bg-blue-100 inline-block px-4 py-2 rounded-md"}>
                  <span className="font-semibold">{m.role === "assistant" ? "LEXA: " : "YOU: "}</span>
                  {m.content}
                </p>
              </div>
            ))}
            {loading && <p className="italic text-sm text-gray-400 animate-pulse">Lexa is thinking...</p>}
          </div>

          <div className="flex items-center gap-2 p-4 border-t bg-white">
            <input
              type="text"
              placeholder="Type your question here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 px-4 py-2 border rounded-full text-sm"
            />
            <label className="cursor-pointer">
              <Paperclip className="text-gray-500 w-5 h-5" />
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
            <button onClick={sendMessage} className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
