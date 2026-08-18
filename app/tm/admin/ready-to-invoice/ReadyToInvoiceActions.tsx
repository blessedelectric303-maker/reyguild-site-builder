"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReadyToInvoiceActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "sendback">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function call(action: "complete" | "send_back") {
    setError("");
    if (action === "send_back" && reason.trim().length < 3) {
      setError("Please give a reason (at least 3 characters) so the tech knows what to fix.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/jobs/" + jobId + "/invoice-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: action === "send_back" ? reason.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (mode === "sendback") {
    return (
      <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <label className="block text-sm font-medium text-slate-700">
          Reason for sending back
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={submitting}
          rows={3}
          maxLength={500}
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="What does the tech need to fix or redo?"
        />
        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => call("send_back")}
            disabled={submitting || reason.trim().length < 3}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {submitting ? "Sending back…" : "Confirm send back"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("idle");
              setReason("");
              setError("");
            }}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => call("complete")}
          disabled={submitting}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {submitting ? "Working…" : "Sent invoice — mark complete"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError("");
            setMode("sendback");
          }}
          disabled={submitting}
          className="rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
        >
          Send back with reason
        </button>
      </div>
    </div>
  );
}
