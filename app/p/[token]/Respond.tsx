"use client";

import { useState } from "react";

// Two buttons. Accept is one tap, because friction on a yes costs money.
// Decline asks one optional question, because a reason is the most useful
// thing in the whole table and people will tell you if you make it easy.

export default function Respond({
  token,
  company,
  phone,
}: {
  token: string;
  company: string;
  phone: string;
}) {
  const [mode, setMode] = useState<"" | "accept" | "decline">("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"" | "accepted" | "declined">("");
  const [error, setError] = useState<string | null>(null);

  async function send(response: "accepted" | "declined") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/proposal/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, response, reason }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "That did not go through. Please try again.");
        setBusy(false);
        return;
      }
      setDone(response);
    } catch {
      setError("No connection. Nothing was sent.");
    }
    setBusy(false);
  }

  if (done === "accepted") {
    return (
      <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 8, padding: 18, lineHeight: 1.6 }}>
        <strong style={{ fontSize: 16 }}>Accepted. Thank you.</strong>
        <br />
        {company} has been notified and will contact you to book it in.
        {phone ? " Any questions before then, call " + phone + "." : ""}
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: 8, padding: 18, lineHeight: 1.6 }}>
        <strong style={{ fontSize: 16 }}>Thank you for letting us know.</strong>
        <br />
        You will not hear from us about this one again. If your plans change,
        {phone ? " call " + phone + "." : " get in touch."}
      </div>
    );
  }

  const btn = {
    display: "block",
    width: "100%",
    padding: "14px 16px",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    border: "none",
  } as const;

  if (mode === "decline") {
    return (
      <div>
        <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginTop: 0 }}>
          No problem at all. If you feel like saying why, it genuinely helps us
          &mdash; but you can leave it blank.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Price, timing, went with someone else, changed our mind..."
          style={{
            width: "100%",
            padding: 12,
            border: "1px solid #cbd5e1",
            borderRadius: 8,
            fontSize: 15,
            fontFamily: "inherit",
            marginBottom: 12,
          }}
        />
        {error ? <p style={{ color: "#dc2626", fontSize: 14 }}>{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => send("declined")}
          style={{ ...btn, background: "#475569", color: "#fff", opacity: busy ? 0.5 : 1 }}
        >
          {busy ? "Sending..." : "Send"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setMode("")}
          style={{ ...btn, background: "transparent", color: "#64748b", marginTop: 8 }}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      {error ? <p style={{ color: "#dc2626", fontSize: 14 }}>{error}</p> : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => send("accepted")}
        style={{ ...btn, background: "#0F6E56", color: "#fff", opacity: busy ? 0.5 : 1 }}
      >
        {busy ? "Sending..." : "Accept this proposal"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setMode("decline")}
        style={{
          ...btn,
          background: "#fff",
          color: "#475569",
          border: "1px solid #cbd5e1",
          marginTop: 10,
        }}
      >
        No thanks
      </button>
      <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 12 }}>
        Questions first? {phone ? "Call " + phone : "Reply to the email"} &mdash; there is no rush.
      </p>
    </div>
  );
}
