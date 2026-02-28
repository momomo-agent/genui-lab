"use client";

import { useState } from "react";
import { GenUIRenderer, UISpec } from "@/components/renderer";
import "@/components/renderer.css";

interface Message {
  role: "user" | "ai";
  text?: string;
  spec?: UISpec;
  loading?: boolean;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", spec: data.spec }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "ai", text: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--accent)" }}>GenUI Lab</h1>
        <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>输入意图，LLM 实时生成 UI</p>
      </header>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            {msg.role === "user" ? (
              <div style={{ background: "var(--bg3)", padding: "8px 14px", borderRadius: 16, maxWidth: "80%", fontSize: 14 }}>
                {msg.text}
              </div>
            ) : msg.spec ? (
              <GenUIRenderer spec={msg.spec} />
            ) : (
              <div style={{ fontSize: 14, color: "var(--text2)" }}>{msg.text}</div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ fontSize: 13, color: "var(--text2)" }}>生成中...</div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, position: "sticky", bottom: 20 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="试试：帮我点个拿铁、查天气、订会议室..."
          disabled={loading}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--bg2)",
            color: "var(--text)", fontSize: 14, outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px", borderRadius: 10, border: "none",
            background: "var(--accent)", color: "var(--bg)",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}
        >
          发送
        </button>
      </form>
    </div>
  );
}