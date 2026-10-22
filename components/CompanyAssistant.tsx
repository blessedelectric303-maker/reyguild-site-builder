"use client";

import { useId, useState } from "react";

export default function CompanyAssistant() {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask() {
    if (busy || !question.trim()) return;
    setBusy(true);
    setError("");
    setAnswer("");
    try {
      const response = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "assistant", input: question }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not get an answer. Try again.");
      setAnswer(body.result.answer);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not reach the assistant. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-6 rounded-xl border border-slate-700 bg-slate-900/50 p-4 text-left">
      <summary className="cursor-pointer font-semibold text-white">Company assistant</summary>
      <p className="mt-3 text-sm text-slate-400">Ask for help planning work or using ReyGuild. Add the job details you want considered.</p>
      <label htmlFor={id} className="mt-3 block text-sm text-slate-200">Your question</label>
      <textarea id={id} rows={3} maxLength={10000} value={question} onChange={(event) => setQuestion(event.target.value)} disabled={busy}
        className="mt-2 w-full rounded-md border border-slate-600 bg-slate-950 p-3 text-sm text-white" />
      <button type="button" onClick={ask} disabled={busy || !question.trim()} className="mt-2 rounded-md bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy ? "Thinking…" : "Ask assistant"}</button>
      <div aria-live="polite" aria-busy={busy}>
        {answer && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{answer}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p>}
      </div>
    </details>
  );
}
