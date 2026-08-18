"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TimeOffDecisionActions({
  requestId,
}: {
  requestId: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approving" | "denying">("idle");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(decision: "approved" | "denied") {
    setError(null);

    if (decision === "denied" && reason.trim().length < 3) {
      setError("Please provide a reason for the denial (at least 3 characters).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/time-off/" + requestId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          decisionReason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save.");
        setLoading(false);
        return;
      }
      setMode("idle");
      setReason("");
      setLoading(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  if (mode === "idle") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("approving")}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => setMode("denying")}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
        >
          Deny
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
      <label className="block text-xs font-medium text-slate-700">
        {mode === "approving" ? "Note (optional)" : "Reason for denial (required)"}
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder={
          mode === "approving"
            ? "Any note for the tech..."
            : "e.g. We have too many people out that week"
        }
        className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded"
      />
      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {error}
        </div>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => decide(mode === "approving" ? "approved" : "denied")}
          disabled={loading}
          className={
            "flex-1 text-white text-sm font-medium px-3 py-1.5 rounded disabled:opacity-50 " +
            (mode === "approving"
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-red-600 hover:bg-red-700")
          }
        >
          {loading
            ? "Saving..."
            : mode === "approving"
            ? "Confirm approval"
            : "Confirm denial"}
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("idle");
            setReason("");
            setError(null);
          }}
          disabled={loading}
          className="bg-white hover:bg-slate-100 text-slate-700 text-sm font-medium px-3 py-1.5 rounded border border-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
