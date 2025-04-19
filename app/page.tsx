"use client";

import { useState, useEffect, useRef } from "react";
import { Paperclip, Send, BookOpen } from "lucide-react";
import { marked } from "marked";
import "./globals.css";

marked.setOptions({
  breaks: true,
  gfm: true,
});

function renderMarkdown(md: string): string {
  const result = marked.parse(md);
  return typeof result === "string" ? result : "";
}

const STEPS = ["init", "question", "point", "evidence", "explanation", "done"] as const;
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
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "👋 Hi there! Click the **Essay Help** button on the left to get started. I'll guide you through writing an awesome PEEL paragraph!",
    },
  ]);
  const [showContinueAnyway, setShowContinueAnyway] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pushUser = (text: string) =>
    setMessages(m => [...m, { role: "user", content: text }]);
  const pushAssistant = (text: string) =>
    setMessages(m => [...m, { role: "assistant", content: text }]);

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
      setFileNames(prev => [...prev, file.name]);
      pushAssistant(`📎 PDF uploaded: ${file.name}`);
    } catch {
      alert("Upload failed.");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  const generatePoints = async () => {
    pushUser(`${essayQuestion}`);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: essayQuestion, file_ids: fileIds }),
      });
      const data = await res.json();
      setEssayPoints(data.points || []);
      pushAssistant("## ✨ Great question! \nHere are some strong points to consider. Pick one you'd like to explore.");
      setEssayStep("point");
    } catch {
      alert("Failed to generate points.");
    } finally {
      setLoading(false);
    }
  };

  const generateEvidence = async (point: string) => {
    pushUser(`${point}`);
    setSelectedPoint(point);
    setLoading(true);
    try {
      const res = await fetch("/api/generate-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ point, question: essayQuestion, file_ids: fileIds }),
      });
      const data = await res.json();
      setEvidence({ optionA: data.weak, optionB: data.strong });
      setShowContinueAnyway(false);
      pushAssistant("## 💡 Here are two evidence options. Pick one to continue:");
      pushAssistant(`## 🔸 Option A\n${data.weak}`);
pushAssistant(`## 🔹 Option B\n${data.strong}`);
setEssayStep("evidence");
    } catch {
      alert("Failed to generate evidence.");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    if (essayStep === "question") {
      setEssayQuestion(input);
      pushUser(input);
      setInput("");
      await generatePoints();
      return;
    }

    if (essayStep === "evidence" && evidence) {
      if (input.includes(evidence.optionB)) {
        pushUser(input);
        pushAssistant([
          "💪 Excellent choice!",
          "",
          "Now let's explain how this evidence supports your point.",
          "",
          (() => {
            const pointTitle = selectedPoint.match(/\*\*(.*?)\*\*/)?.[1] || selectedPoint;
            const pointRest = selectedPoint.replace(/\*\*(.*?)\*\*/, "").trim();
            return `### 📘 ${pointTitle}\n${pointRest}`;
          })(),
          
          "",
          `### 📌 Your Evidence\n${evidence?.optionB || evidence?.optionA}`,
          "",
          "---",
          "### 🧠 Think about:",
          "- What effect did this have?",
          "- Why does this matter?",
          "- How did this contribute to tensions?",
          "",
          "---",
          "### 📝 You can start with:",
          "- *This led to tensions because...*",
          "- *This increased fear because...*",
          "- *As a result...*",
          "",
          "---",
          "Go ahead and try writing your explanation below. I'll give feedback after!"
        ].join("\n"));
        
        setEssayStep("explanation");
        setInput("");
        return;
      }
      if (input.includes(evidence.optionA)) {
        pushUser(input);
        pushAssistant("🤔 That’s a fair start, but Option B might help you write a stronger answer. Want to give it a try?");
        setShowContinueAnyway(true);
        setInput("");
        return;
      }
    }

    if (essayStep === "explanation") {
      const userExplanation = input.trim();
      pushUser(userExplanation);
      setInput("");
      setLoading(true);
      try {
        const res = await fetch("/api/generate-explanation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            explanation: userExplanation,
            point: selectedPoint,
            evidence: evidence?.optionB || evidence?.optionA,
            file_ids: fileIds,
          }),
        });
        const data = await res.json();
        pushAssistant(data.feedback);
        if (data.nextStep === "link") {
          setEssayStep("done");
        }
      } catch {
        alert("Failed to evaluate explanation.");
      } finally {
        setLoading(false);
      }
      return;
    }

    pushUser(input);
    setInput("");
  };

  const bottomInputDisabled = !["explanation", "done"].includes(essayStep);


  return (
    <main className="min-h-screen font-[Inter] bg-gray-50">
      <header className="bg-blue-600 text-white py-4 px-6 text-center">
        <h1 className="text-3xl font-bold tracking-wide">LEXA</h1>
        <p className="text-sm mt-1">Your AI Study Buddy</p>
      </header>

      <div className="flex h-[calc(100vh-100px)]">
        <div className="w-1/4 bg-gray-100 p-4 space-y-4 overflow-y-auto border-r">
          <button
            onClick={() => setEssayStep("question")}
            className="flex items-center justify-center w-full bg-blue-100 hover:bg-blue-200 text-black py-2 px-4 rounded-md font-semibold"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Essay Help
          </button>

          {essayStep === "point" && essayPoints.length > 0 && (
            <div className="mt-4">
              <p className="font-semibold mb-2">Select a Point:</p>
              <div className="space-y-2">
                {essayPoints.map((pt, idx) => (
                  <button
                    key={idx}
                    onClick={() => generateEvidence(pt)}
                    className="w-full text-left bg-white border rounded p-2 hover:bg-blue-100"
                  >
                    <span dangerouslySetInnerHTML={{ __html: renderMarkdown(pt) }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {essayStep === "evidence" && evidence && (
            <div className="mt-4 space-y-2">
              <p className="font-semibold mb-2">Choose Your Evidence:</p>
              <button
                onClick={() => {
                  pushUser("Evidence selected: Option A (Weak)");
                  pushAssistant("🤔 That’s a fair start, but Option B might help you write a stronger answer. Want to give it a try?");
                  setShowContinueAnyway(true);
                }}
                className="w-full text-left bg-white border rounded p-2 hover:bg-gray-100"
              >
                Option A (Weak)
              </button>
              <button
                onClick={() => {
                  pushUser("Evidence selected: Option B (Strong)");
                  pushAssistant([
                    "💪 Excellent choice!",
                    "",
                    "Now let's explain how this evidence supports your point.",
                    "",
                    `📘 **Your Point:** ${selectedPoint}`,
                    `📌 **Your Evidence:** ${evidence?.optionB || evidence?.optionA}`,
                    "",
                    "---",
                    "**Think about:**",
                    "- What effect did this have?",
                    "- Why does this matter?",
                    "- How did this contribute to tensions?",
                    "",
                    "---",
                    "**You can start with:**",
                    "- *This led to tensions because...*",
                    "- *This increased fear because...*",
                    "- *As a result...*",
                    "",
                    "---",
                    "Go ahead and try writing your explanation below. I'll give feedback after!"
                  ].join("\n"));
                  
                  setEssayStep("explanation");
                }}
                className="w-full text-left bg-white border rounded p-2 hover:bg-gray-100"
              >
                Option B (Strong)
              </button>
              {showContinueAnyway && (
                <button
                  onClick={() => {
                    pushAssistant("📘 Alright, go ahead and explain how this evidence supports your point.");
                    setEssayStep("explanation");
                  }}
                  className="w-full mt-2 bg-blue-500 text-white py-2 px-4 rounded"
                >
                  Continue with Option A
                </button>
              )}
            </div>
          )}
        </div>

        <div className="w-3/4 flex flex-col justify-between">
          <div className="flex-1 p-6 overflow-y-auto">
            {essayStep === "question" && (
              <div className="mb-6">
                <label className="block mb-2 font-semibold">Essay Question</label>
                <textarea
                  rows={4}
                  value={essayQuestion}
                  onChange={e => setEssayQuestion(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey && essayQuestion.trim()) {
                      e.preventDefault();
                      generatePoints();
                    }
                  }}
                  className="w-full border rounded p-2 text-sm mb-4"
                />
                <button
                  onClick={generatePoints}
                  disabled={!essayQuestion.trim() || loading}
                  className="bg-blue-500 text-white py-2 px-4 rounded-md disabled:opacity-50"
                >
                  Generate Points
                </button>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`mb-4 ${m.role === "user" ? "text-right" : "text-left"}`}>
                {m.role === "assistant" ? (
                  <div
                    className="markdown-content bg-[#FFF5F6] border border-black border-l-4 border-l-rose-400 inline-block px-4 py-2 rounded-md text-[15px]"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                  />
                ) : (
                  <p className="bg-white text-black border border-black inline-block px-4 py-2 rounded-md max-w-[90%]">
                    {m.content}
                  </p>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
            {essayStep === "done" && (
  <div className="mt-6 flex gap-4 justify-center fade-in">
    <button
      onClick={() => {
        setEssayStep("point"); // Reuse another point
        pushAssistant("📝 Let's write another paragraph. Pick a new point to explore.");
      }}
      className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md"
    >
      🔁 Write Another Paragraph
    </button>

    <button
      onClick={() => {
        setEssayStep("init");
        setEssayQuestion("");
        setEssayPoints([]);
        setSelectedPoint("");
        setEvidence(null);
        setMessages([
          {
            role: "assistant",
            content:
              "👋 Hi again! Click **Essay Help** to start a new question. I'm ready when you are!",
          },
        ]);
      }}
      className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md"
    >
      🆕 Start a New Question
    </button>
  </div>
)}

            {loading && (
              <p className="italic text-sm text-gray-400 animate-pulse">Lexa is thinking...</p>
            )}
          </div>

          <div className="flex items-center gap-2 p-4 border-t bg-white">
            <input
              type="text"
              placeholder={
                bottomInputDisabled
                  ? "Available after choosing evidence..."
                  : essayStep === "explanation"
                  ? "Type your explanation here..."
                  : "Type your linking sentence here..."
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !bottomInputDisabled) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 px-4 py-4 border rounded-full text-sm disabled:opacity-50"
              disabled={bottomInputDisabled}
            />
            <label className="cursor-pointer opacity-50">
              <Paperclip className="text-gray-500 w-5 h-5" />
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              onClick={handleSend}
              disabled={bottomInputDisabled}
              className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
