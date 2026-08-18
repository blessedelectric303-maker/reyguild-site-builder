"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AssignmentRateEditor({
  assignmentId,
  techName,
  defaultRate,
  currentOverride,
}: {
  assignmentId: string;
  techName: string;
  defaultRate: number | null;
  currentOverride: number | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rateInput, setRateInput] = useState(
    currentOverride !== null ? currentOverride.toFixed(2) : ""
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const defaultRateLabel =
    defaultRate !== null && defaultRate > 0
      ? "$" + defaultRate.toFixed(2) + "/hr"
      : "not set";

  const effectiveRate =
    currentOverride !== null
      ? currentOverride
      : defaultRate !== null
      ? defaultRate
      : null;

  async function handleSave() {
    setError(null);

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError("Reason is required (min 3 characters)");
      return;
    }

    let rateValue: number | null = null;
    const trimmed = rateInput.trim();
    if (trimmed !== "") {
      const n = Number(trimmed);
      if (isNaN(n) || n <= 0) {
        setError("Enter a positive number, or leave blank to clear");
        return;
      }
      if (n > 999.99) {
        setError("Maximum rate is $999.99/hr");
        return;
      }
      rateValue = n;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/job-assignments/" + assignmentId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hourlyRateOverride: rateValue,
          reason: trimmedReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Save failed");
        setBusy(false);
        return;
      }
      setEditing(false);
      setReason("");
      router.refresh();
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="w-full mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Custom rate for {techName} on this job
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value)}
              placeholder="Leave blank to use default"
              className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded text-sm"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Default rate: {defaultRateLabel}. Blank = use default. Applies only
            to future clock-outs.
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Reason * (audit-logged)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Premium rate for hard job, apprentice rate, etc."
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
          />
        </div>
        {error && (
          <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
            {error}
          </div>
        )}
        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setRateInput(
                currentOverride !== null ? currentOverride.toFixed(2) : ""
              );
              setReason("");
              setError(null);
            }}
            disabled={busy}
            className="text-xs px-3 py-1.5 border border-slate-300 bg-white rounded text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="text-xs px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
      <span>
        Rate:{" "}
        <span className="text-slate-700 font-medium">
          {effectiveRate !== null ? "$" + effectiveRate.toFixed(2) + "/hr" : "not set"}
        </span>
        {currentOverride !== null && (
          <span className="ml-1 text-amber-700">(custom)</span>
        )}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-brand-600 hover:underline"
      >
        Edit
      </button>
    </div>
  );
}
