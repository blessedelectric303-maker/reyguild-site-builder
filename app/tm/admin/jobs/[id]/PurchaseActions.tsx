"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PurchaseActions({
  purchaseId,
  isDraft,
  amount,
}: {
  purchaseId: string;
  isDraft: boolean;
  amount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmPurchase() {
    if (!confirm("Confirm $" + amount.toFixed(2) + "? This deducts from job profit and can't be undone (only edited or deleted with audit log).")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/purchases/" + purchaseId + "/confirm", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Confirm failed");
      else router.refresh();
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  async function editPurchase() {
    const newAmountStr = prompt("New total amount? (current: $" + amount.toFixed(2) + ")");
    if (newAmountStr === null) return;
    const newAmount = Number(newAmountStr);
    if (isNaN(newAmount) || newAmount <= 0) {
      alert("Invalid amount");
      return;
    }
    const reason = prompt("Reason for edit (required for audit log):");
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/purchases/" + purchaseId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalAmount: newAmount, reason }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Edit failed");
      else router.refresh();
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  async function deletePurchase() {
    const reason = prompt("Delete this purchase. Reason (required for audit log):");
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/purchases/" + purchaseId, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Delete failed");
      else router.refresh();
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      {isDraft && (
        <button
          onClick={confirmPurchase}
          disabled={busy}
          className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1 rounded disabled:opacity-50"
        >
          {busy ? "..." : "Confirm"}
        </button>
      )}
      <div className="flex gap-1">
        <button
          onClick={editPurchase}
          disabled={busy}
          className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1"
        >
          Edit
        </button>
        <button
          onClick={deletePurchase}
          disabled={busy}
          className="text-xs text-red-600 hover:text-red-700 px-2 py-1"
        >
          Delete
        </button>
      </div>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}