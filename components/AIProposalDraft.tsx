"use client";

import { useId, useState } from "react";
import { validateProposalDraft, type ProposalDraft } from "@/lib/reyguild-ai";

export default function AIProposalDraft({ onUseDraft }: { onUseDraft: (draft: ProposalDraft) => void }) {
  const id = useId();
  const [outline, setOutline] = useState("");
  const [draft, setDraft] = useState<ProposalDraft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (busy || !outline.trim()) return;
    setBusy(true);
    setError("");
    setDraft(null);
    try {
      const response = await fetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "proposal", input: outline }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not draft this proposal. Try again.");
      setDraft(validateProposalDraft(body.result));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not reach AI. Your outline is still here.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details style={{ border: "1px solid #16243F", borderRadius: 8, padding: 14, marginBottom: 16 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>Draft scope from your outline with AI</summary>
      <label htmlFor={id} style={{ display: "block", marginTop: 12 }}>Your outline</label>
      <textarea id={id} rows={5} maxLength={10000} value={outline} disabled={busy} onChange={(event) => setOutline(event.target.value)}
        placeholder="Describe the work, what is included, exclusions and any details the customer needs." style={{ width: "100%", marginTop: 6 }} />
      <button type="button" className="fl-job-btn" disabled={busy || !outline.trim()} onClick={generate}>{busy ? "Drafting…" : "Generate draft"}</button>
      <div aria-live="polite" aria-busy={busy}>
        {error && <p role="alert" className="fl-error">{error}</p>}
        {draft && <div style={{ marginTop: 14 }}>
          <h3>{draft.title}</h3>
          <p>{draft.summary}</p>
          <ul>{draft.scope.map((line, index) => <li key={index}>{line}</li>)}</ul>
          {draft.exclusions.length > 0 && <><strong>Exclusions</strong><ul>{draft.exclusions.map((line, index) => <li key={index}>{line}</li>)}</ul></>}
          {draft.questions.length > 0 && <><strong>Confirm before sending</strong><ul>{draft.questions.map((line, index) => <li key={index}>{line}</li>)}</ul></>}
          <p className="fl-hint">Review the scope, answer outstanding questions and enter your price. Applying this draft fills the description and leaves the price blank.</p>
          <button type="button" className="fl-job-btn" onClick={() => { onUseDraft(draft); setDraft(null); }}>Use this scope in my proposal</button>
        </div>}
      </div>
    </details>
  );
}
