"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SalePriceEditor({
  jobId,
  currentPrice,
}: {
  jobId: string;
  currentPrice: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(String(currentPrice || ""));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEditing() {
    setPrice(String(currentPrice || ""));
    setReason("");
    setError(null);
    setOpen(true);
  }

  function cancel() {
    setOpen(false);
    setError(null);
  }

  async function save() {
    setError(null);

    const parsed = Number(price);
    if (isNaN(parsed) || parsed < 0) {
      setError("Sale price must be a valid positive number.");
      return;
    }
    if (parsed > 99999999) {
      setError("Sale price cannot exceed $99,999,999.");
      return;
    }

    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) {
      setError("Please provide a brief reason (at least 3 characters).");
      return;
    }

    if (parsed === currentPrice) {
      setError("New price is the same as the current price.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        "/api/admin/jobs/" + jobId + "/sale-price",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ salePrice: parsed, reason: trimmedReason }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to save.");
        setLoading(false);
        return;
      }

      setOpen(false);
      setLoading(false);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={startEditing}
        className="text-xs text-brand-600 hover:underline ml-2"
      >
        Edit
      </button>
    );
  }

  return (
    <div className="mt-2 bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-2">
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          New sale price
        </label>
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
            $
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            autoFocus
            className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Reason for change (required, logged)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Original price entered incorrectly"
          maxLength={500}
          className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium px-3 py-1.5 rounded disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save price"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={loading}
          className="text-xs bg-white hover:bg-slate-100 text-slate-700 font-medium px-3 py-1.5 rounded border border-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
