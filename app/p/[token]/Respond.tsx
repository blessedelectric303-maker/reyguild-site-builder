"use client";

import { useRef, useState } from "react";

// THREE ANSWERS, NOT TWO.
//
//   Sign to approve   - a real signature, then it becomes a job
//   Think on it       - writes NOTHING, on purpose. The follow-up cron skips
//                       any proposal that has a row in proposal_responses, so
//                       recording a "thinking" answer would stop the day 3/7/12
//                       chase AND lock the customer out of accepting later
//                       (there is a unique index on company + proposal).
//                       Saying nothing keeps the proposal live.
//   Not this time     - stops the chase, asks one optional question
//
// Only the customer can approve. There is no route into this from inside the
// app, which is the point: a tech cannot mark a job approved on a customer's
// behalf from a driveway.

export default function Respond({
  token,
  company,
  phone,
  total,
  terms,
}: {
  token: string;
  company: string;
  phone: string;
  total?: string;
  // The exact warranty, labor note and agreement shown on this page. Sent back
  // with the answer so what the customer agreed to is kept word for word, even
  // if the company edits its standard wording next week.
  terms?: { labor: string; warranty: string; contract: string };
}) {
  const [mode, setMode] = useState<"" | "sign" | "decline" | "thinking">("");
  const [reason, setReason] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"" | "accepted" | "declined">("");
  const [error, setError] = useState<string | null>(null);
  const [hasInk, setHasInk] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);

  function ctxOf() {
    const c = canvasRef.current;
    if (!c) return null;
    const g = c.getContext("2d");
    if (!g) return null;
    g.lineWidth = 2.2;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "#111";
    return g;
  }

  function pos(e: any) {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    const t = e.touches && e.touches[0] ? e.touches[0] : e;
    return {
      x: ((t.clientX - r.left) / r.width) * c.width,
      y: ((t.clientY - r.top) / r.height) * c.height,
    };
  }

  function start(e: any) {
    e.preventDefault();
    const g = ctxOf();
    if (!g) return;
    drawing.current = true;
    const p = pos(e);
    g.beginPath();
    g.moveTo(p.x, p.y);
  }

  function move(e: any) {
    if (!drawing.current) return;
    e.preventDefault();
    const g = ctxOf();
    if (!g) return;
    const p = pos(e);
    g.lineTo(p.x, p.y);
    g.stroke();
    if (!hasInk) setHasInk(true);
  }

  function end() {
    drawing.current = false;
  }

  function clearPad() {
    const c = canvasRef.current;
    const g = ctxOf();
    if (c && g) g.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  }

  async function send(response: "accepted" | "declined") {
    setBusy(true);
    setError(null);
    try {
      const payload: any = { token, response, reason };
      if (response === "accepted") {
        payload.signatureName = name.trim();
        payload.signatureData = canvasRef.current ? canvasRef.current.toDataURL("image/png") : "";
        payload.terms = terms || null;
      }
      const res = await fetch("/api/proposal/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const box = {
    background: "#f5f5f5",
    border: "1px solid #d4d4d4",
    borderRadius: 6,
    padding: 18,
    fontSize: 14,
    lineHeight: 1.6,
  } as const;

  if (done === "accepted") {
    return (
      <div style={box}>
        <strong style={{ fontSize: 16 }}>Approved. Thank you.</strong>
        <br />
        {company} has been notified and will contact you to book it in.
        {phone ? " Any questions before then, call " + phone + "." : ""}
      </div>
    );
  }

  if (done === "declined") {
    return (
      <div style={box}>
        <strong style={{ fontSize: 16 }}>Thank you for letting us know.</strong>
        <br />
        You will not hear from us about this one again. If your plans change,
        {phone ? " call " + phone + "." : " get in touch."}
      </div>
    );
  }

  if (mode === "thinking") {
    return (
      <div style={box}>
        <strong style={{ fontSize: 16 }}>No rush at all.</strong>
        <br />
        This proposal stays open and the link keeps working, so come back to it
        whenever you are ready.
        {phone ? " If anything needs explaining first, call " + phone + "." : ""}
        <div style={{ marginTop: 12 }}>
          <button type="button" onClick={() => setMode("")}
            style={{ background: "transparent", border: "none", color: "#555", textDecoration: "underline", cursor: "pointer", fontSize: 14, padding: 0 }}>
            Back to the proposal
          </button>
        </div>
      </div>
    );
  }

  // THE APP'S CHROME GOLD with navy lettering - the same metal as the
  // buttons inside ReyGuild, so the customer's page looks like it came from us.
  const GOLD = {
    background: "#B07A00",
    backgroundImage: "linear-gradient(160deg,#F0CE7A 0%,#CC9000 34%,#8A5E00 58%,#D89000 82%,#F0CE7A 100%)",
    color: "#16243F",
    border: "1px solid #8A5E00",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.55), 0 1px 2px rgba(0,0,0,.25)",
    fontWeight: 800,
  };

  const btn = {
    display: "block",
    width: "100%",
    padding: "14px 16px",
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    border: "1px solid #111",
    fontFamily: "inherit",
  } as const;

  if (mode === "sign") {
    const ready = hasInk && name.trim().length > 1;
    return (
      <div>
        <p style={{ fontSize: 14, color: "#333", lineHeight: 1.6, marginTop: 0 }}>
          Sign below to approve this proposal{total ? " at " + total : ""}. Your
          signature confirms the scope, the price, and the terms set out above.
        </p>

        <label style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#666", marginBottom: 4 }}>
          Your full name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type your name"
          style={{ width: "100%", padding: 12, border: "1px solid #bbb", borderRadius: 6, fontSize: 15, fontFamily: "inherit", marginBottom: 14, boxSizing: "border-box" }}
        />

        <label style={{ display: "block", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#666", marginBottom: 4 }}>
          Signature
        </label>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          style={{ width: "100%", height: 170, border: "1px solid #bbb", borderRadius: 6, background: "#fff", touchAction: "none", display: "block" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "6px 0 16px" }}>
          <span style={{ fontSize: 12, color: "#888" }}>Draw with a finger or a mouse.</span>
          <button type="button" onClick={clearPad}
            style={{ background: "transparent", border: "none", color: "#555", textDecoration: "underline", cursor: "pointer", fontSize: 13 }}>
            Clear
          </button>
        </div>

        {error ? <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p> : null}

        <button type="button" disabled={busy || !ready} onClick={() => send("accepted")}
          style={ready ? { ...btn, ...GOLD, opacity: busy ? 0.5 : 1 } : { ...btn, background: "#999", color: "#fff", borderColor: "#999", opacity: busy ? 0.5 : 1 }}>
          {busy ? "Sending..." : "Approve this proposal"}
        </button>
        <button type="button" disabled={busy} onClick={() => setMode("")}
          style={{ ...btn, background: "#fff", color: "#333", marginTop: 10, borderColor: "#bbb" }}>
          Go back
        </button>
      </div>
    );
  }

  if (mode === "decline") {
    return (
      <div>
        <p style={{ fontSize: 14, color: "#333", lineHeight: 1.6, marginTop: 0 }}>
          No problem at all. If you feel like saying why, it genuinely helps us
          &mdash; but you can leave it blank.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Price, timing, went with someone else, changed our mind..."
          style={{ width: "100%", padding: 12, border: "1px solid #bbb", borderRadius: 6, fontSize: 15, fontFamily: "inherit", marginBottom: 12, boxSizing: "border-box" }}
        />
        {error ? <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p> : null}
        <button type="button" disabled={busy} onClick={() => send("declined")}
          style={{ ...btn, background: "#444", color: "#fff", borderColor: "#444", opacity: busy ? 0.5 : 1 }}>
          {busy ? "Sending..." : "Send"}
        </button>
        <button type="button" disabled={busy} onClick={() => setMode("")}
          style={{ ...btn, background: "#fff", color: "#333", marginTop: 10, borderColor: "#bbb" }}>
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      {error ? <p style={{ color: "#b91c1c", fontSize: 14 }}>{error}</p> : null}
      <button type="button" onClick={() => setMode("sign")}
        style={{ ...btn, ...GOLD }}>
        Sign to approve
      </button>
      <button type="button" onClick={() => setMode("thinking")}
        style={{ ...btn, background: "#fff", color: "#333", borderColor: "#bbb", marginTop: 10 }}>
        I want to think on it
      </button>
      <button type="button" onClick={() => setMode("decline")}
        style={{ ...btn, background: "#fff", color: "#666", borderColor: "#ddd", marginTop: 10, fontWeight: 400 }}>
        Not this time
      </button>
      <p style={{ fontSize: 12, color: "#888", textAlign: "center", marginTop: 14 }}>
        Questions first? {phone ? "Call " + phone : "Reply to the email"} &mdash; there is no rush.
      </p>
    </div>
  );
}
