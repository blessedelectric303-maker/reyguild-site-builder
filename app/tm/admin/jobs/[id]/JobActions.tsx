"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JobActions({
  jobId,
  status,
  isOwner,
}: {
  jobId: string;
  status: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArchived = status === "archived";

  async function archive() {
    const reason = prompt("Archive this job. Reason:");
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/jobs/" + jobId + "/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Archive failed");
      else {
        router.push("/tm/admin/jobs");
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  async function restore() {
    if (!confirm("Restore this archived job?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/jobs/" + jobId + "/restore", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Restore failed");
      else router.refresh();
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  async function permanentDelete() {
    const reason = prompt("PERMANENT DELETE — this cannot be undone. Reason:");
    if (!reason) return;
    const confirmText = prompt('Type "DELETE" exactly to confirm permanent deletion:');
    if (confirmText !== "DELETE") {
      alert("You must type DELETE exactly to confirm.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/jobs/" + jobId, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, confirmText }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Delete failed");
      else {
        router.push("/tm/admin/jobs");
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {!isArchived ? (
        <button
          onClick={archive}
          disabled={busy}
          className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          {busy ? "..." : "Archive Job"}
        </button>
      ) : (
        <>
          {isOwner && (
            <button
              onClick={restore}
              disabled={busy}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              Restore
            </button>
          )}
          {isOwner && (
            <button
              onClick={permanentDelete}
              disabled={busy}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              Permanent Delete
            </button>
          )}
        </>
      )}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}
