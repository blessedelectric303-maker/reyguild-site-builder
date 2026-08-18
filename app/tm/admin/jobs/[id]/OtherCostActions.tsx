"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OtherCostActions({
  costId,
  description,
  amount,
  notes,
}: {
  costId: string;
  description: string;
  amount: number;
  notes: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const [editDescription, setEditDescription] = useState(description);
  const [editAmount, setEditAmount] = useState(amount.toFixed(2));
  const [editNotes, setEditNotes] = useState(notes || "");
  const [editReason, setEditReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    const reason = window.prompt(
      "Why are you deleting this cost? (required, audit-logged)"
    );
    if (reason === null) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      alert("A reason of at least 3 characters is required.");
      return;
    }

    if (
      !window.confirm(
        "Delete this cost ($" +
          amount.toFixed(2) +
          ' — "' +
          description +
          '") permanently? This cannot be undone.'
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/other-job-costs/" + costId, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Delete failed");
        setBusy(false);
        return;
      }
      router.refresh();
    } catch {
      alert("Network error");
      setBusy(false);
    }
  }

  async function handleSaveEdit() {
    setError(null);
    const trimmedDescription = editDescription.trim();
    if (!trimmedDescription) {
      setError("Description cannot be empty");
      return;
    }
    if (trimmedDescription.length > 200) {
      setError("Description is too long (max 200 characters)");
      return;
    }
    const amountNum = Number(editAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount");
      return;
    }
    const trimmedReason = editReason.trim();
    if (trimmedReason.length < 3) {
      setError("A reason of at least 3 characters is required");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/admin/other-job-costs/" + costId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: trimmedDescription,
          amount: amountNum,
          notes: editNotes.trim(),
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
      setEditReason("");
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
            Description
          </label>
          <input
            type="text"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Notes
          </label>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Reason for edit * (audit-logged)
          </label>
          <input
            type="text"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            placeholder="Wrong amount entered, vendor name typo, etc."
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
              setEditDescription(description);
              setEditAmount(amount.toFixed(2));
              setEditNotes(notes || "");
              setEditReason("");
              setError(null);
            }}
            disabled={busy}
            className="text-xs px-3 py-1.5 border border-slate-300 bg-white rounded text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveEdit}
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
    <div className="flex gap-2 shrink-0">
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={busy}
        className="text-xs text-slate-600 hover:text-slate-900 hover:underline disabled:opacity-50"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy}
        className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
      >
        {busy ? "..." : "Delete"}
      </button>
    </div>
  );
}
