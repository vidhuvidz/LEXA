"use client";

import { useState } from "react";
import "./globals.css";

type Msg = { role: "user" | "assistant"; content: string };

export default function Home() {
  const [fileIds, setFileIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // PEEL flow state
  const [essayStep, setEssayStep] = useState<
    "init" | "question" | "point" | "evidence" | "explanation" | "link" | "done"
  >("init");
  const [essayQuestion, setEssayQuestion] = useState("");
  const [essayPoints, setEssayPoints] = useState<string[]>([]);
  const [selectedPoint, setSelectedPoint] = useState("");
  const [evidenceOptions, setEvidenceOptions] = useState<{ weak: string; strong: string }>({ weak: "", strong: "" });
  const [selectedEvidence, setSelectedEvidence] = useState<"A" | "B" | "">("");
  const [explanation, setExplanation] = useState("");
  const [linkSentence, setLinkSentence] = useState("");

  // Chat history
  const [messages, setMessages] = useState<Msg[]>([]);
  const pushUser = (text: string) => setMessages(m => [...m, { role: "user", content: text }]);
  const pushAssistant = (text: string) => setMessages(m => [...m, { role: "assistant", content: text }]);

  // Handle PDF upload
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
      setFileIds(prev => [...prev, json.id]);
      pushAssistant("📎 PDF uploaded.");
    } catch {
      alert("Upload failed.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  // Generate essay points
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

  // Generate evidence
  const generateEvidence = async (point: string) => {
    pushUser(`Point selected: ${point}`);
    setSelectedPoint(point);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ point, question: essayQuestion, file_ids: fileIds }),
      });
      const data = await res.json();
      setEvidenceOptions({ weak: data.weak, strong: data.strong });
      pushAssistant(`🔸 **Option A (Weak):** ${data.weak}`);
      pushAssistant(`🔹 **Option B (Strong):** ${data.strong}`);
      setEssayStep("evidence");
    } catch {
      alert("Failed to generate evidence.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white p-6 font-sans">
      <div className="flex max-w-4xl mx-auto shadow-lg rounded-lg overflow-hidden">
        {/* Left column: PEEL controls */}
        <div className="w-1/3 bg-gray-100 p-4 space-y-6">
          {essayStep === "init" && (
            <button
              onClick={() => setEssayStep("question")}
              className="w-full bg-green-500 text-white py-3 rounded-full font-bold hover:bg-green-600"
            >✍️ Help me with an essay question</button>
          )}

          {essayStep === "question" && (
            <div className="space-y-4">
              <label className="font-semibold">Essay Question</label>
              <textarea
                rows={3}
                className="w-full border rounded p-2"
                value={essayQuestion}
                onChange={e => setEssayQuestion(e.target.value)}
              />
              <input type="file" accept=".pdf" onChange={handleFileUpload} />
              <button
                onClick={generatePoints}
                disabled={!essayQuestion.trim() || loading}
                className="w-full bg-blue-500 text-white py-2 rounded-full disabled:opacity-50"
              >Generate Points</button>
            </div>
          )}

          {essayStep === "point" && (
            <div>
              <p className="font-semibold mb-2">Select a Point:</p>
              <div className="space-y-2">
                {essayPoints.map((pt, idx) => (
                  <button
                    key={idx}
                    onClick={() => generateEvidence(pt)}
                    className="w-full text-left bg-white border rounded p-2 hover:bg-blue-100"
                  >{pt}</button>
                ))}
              </div>
            </div>
          )}

          {essayStep === "evidence" && (
            <div>
              <p className="font-semibold mb-2">Choose Evidence:</p>
              <button
                onClick={() => {
                  pushUser(`Evidence selected: Option A (Weak)`);
                  pushAssistant(`📖 Great! Now explain how this evidence supports your point.`);
                  setSelectedEvidence("A");
                  setEssayStep("explanation");
                }}
                className="w-full text-left bg-white border rounded p-2 hover:bg-gray-100"
              >Option A (Weak)</button>
              <button
                onClick={() => {
                  pushUser(`Evidence selected: Option B (Strong)`);
                  pushAssistant(`💡 Excellent choice! Now write an explanation linking this evidence back to your point.`);
                  setSelectedEvidence("B");
                  setEssayStep("explanation");
                }}
                className="w-full text-left bg-white border rounded p-2 mt-2 hover:bg-gray-100"
              >Option B (Strong)</button>
            </div>
          )}

          {essayStep === "explanation" && (
            <div className="space-y-4">
              <label className="font-semibold">Your Explanation</label>
              <textarea
                rows={4}
                className="w-full border rounded p-2"
                value={explanation}
                onChange={e => setExplanation(e.target.value)}
              />
              <button
                onClick={() => {
                  pushUser(`Explanation: ${explanation}`);
                  pushAssistant(`🔗 Now write a linking sentence back to the question.`);
                  setEssayStep("link");
                }}
                disabled={!explanation.trim()}
                className="w-full bg-blue-500 text-white py-2 rounded-full disabled:opacity-50"
              >Next: Linking Sentence</button>
            </div>
          )}

          {essayStep === "link" && (
            <div className="space-y-4">
              <label className="font-semibold">Linking Sentence</label>
              <textarea
                rows={2}
                className="w-full border rounded p-2"
                value={linkSentence}
                onChange={e => setLinkSentence(e.target.value)}
              />
              <button
                onClick={() => {
                  pushUser(`Link: ${linkSentence}`);
                  pushAssistant(`🎉 Nice work! You've completed a full PEEL paragraph.`);
                  setEssayStep("done");
                }}
                disabled={!linkSentence.trim()}
                className="w-full bg-green-500 text-white py-2 rounded-full disabled:opacity-50"
              >Complete Paragraph</button>
            </div>
          )}
        </div>  {/* end left pane */}

        {/* Right column: chat history */}
        <div className="w-2/3 p-4 bg-white h-[600px] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "mb-4 text-right" : "mb-4 text-left"}>
              <p className={m.role === "assistant" ? "font-bold" : "italic"}>
                {m.role === "assistant" ? "LEXA:" : "YOU:"} {m.content}
              </p>
            </div>
          ))}
          {loading && <p className="italic text-gray-400">Lexa is thinking...</p>}
        </div>
      </div>
    </main>
  );
}
