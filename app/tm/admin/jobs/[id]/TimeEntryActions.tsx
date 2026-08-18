"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  entryId: string;
  clockInAt: string;
  clockOutAt: string | null;
  userName: string;
};

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

export default function TimeEntryActions({ entryId, clockInAt, clockOutAt, userName }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [inVal, setInVal] = useState(toLocalInputValue(clockInAt));
  const [outVal, setOutVal] = useState(clockOutAt ? toLocalInputValue(clockOutAt) : "");
  const [reason, setReason] = useState("");
  const isActive = !clockOutAt;

  async function clockOutNow() {
    const r = prompt("Clock out " + userName + " now. Reason:");
    if (!r) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/time-entries/" + entryId + "/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Failed");
      else router.refresh();
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  async function saveEdit() {
    if (!reason.trim()) {
      setError("Reason required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/time-entries/" + entryId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clockInAt: new Date(inVal).toISOString(),
          clockOutAt: outVal ? new Date(outVal).toISOString() : null,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Save failed");
      else {
        setEditing(false);
        setReason("");
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  async function deleteEntry() {
    const r = prompt("Delete this time entry for " + userName + ". Reason:");
    if (!r) return;
    if (!confirm("Really delete this entry? This cannot be undone.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/time-entries/" + entryId, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: r }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Delete failed");
      else router.refresh();
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  if (editing) {
    return (
      <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
        <div>
          <label className="text-xs text-slate-600 block mb-1">Clock In</label>
          <input
            type="datetime-local"
            value={inVal}
            onChange={(e) => setInVal(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600 block mb-1">
            Clock Out {!outVal && "(leave blank to keep active)"}
          </label>
          <input
            type="datetime-local"
            value={outVal}
            onChange={(e) => setOutVal(e.target.value)}
            className="text-xs border border-slate-300 rounded px-2 py-1 w-full"
          />
        </div>
        <div>
          <label className="text-xs text-slate-600 block mb-1">Reason (required)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. tech forgot to clock out"
            className="text-xs border border-slate-300 rounded px-2 py-1 w-full"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={saveEdit}
            disabled={busy}
            className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {busy ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium px-3 py-1.5 rounded-lg"
          >
            Cancel
          </button>
        </div>
        {error && <div className="text-xs text-red-700">{error}</div>}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {isActive && (
        <button
          onClick={clockOutNow}
          disabled={busy}
          className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-2.5 py-1 rounded disabled:opacity-50"
        >
          Clock Out Now
        </button>
      )}
      <button
        onClick={() => setEditing(true)}
        disabled={busy}
        className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium px-2.5 py-1 rounded disabled:opacity-50"
      >
        Edit
      </button>
      <button
        onClick={deleteEntry}
        disabled={busy}
        className="text-xs bg-red-100 hover:bg-red-200 text-red-800 font-medium px-2.5 py-1 rounded disabled:opacity-50"
      >
        Delete
      </button>
      {error && <span className="text-xs text-red-700 w-full">{error}</span>}
    </div>
  );
}
