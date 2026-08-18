"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Photo = {
  id: string;
  imageUrl: string;
  signedUrl: string | null;
  lat: number | null;
  lng: number | null;
  distanceFromJobMiles: number | null;
};

type Request = {
  id: string;
  jobId: string;
  itemName: string;
  qty: number;
  unit: string | null;
  notes: string | null;
  status: string;
  deniedReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  job: { id: string; customerName: string; jobAddress: string };
  requestedBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
  photos: Photo[];
};

export default function MaterialRequestsList({ requests }: { requests: Request[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  async function approve(id: string) {
    setError(null);
    setBusy(id);
    try {
      const res = await fetch("/api/admin/materials/" + id + "/approve", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Approve failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setBusy(null);
  }

  async function deny(id: string) {
    const reason = prompt("Reason for denial?");
    if (!reason) return;
    setError(null);
    setBusy(id);
    try {
      const res = await fetch("/api/admin/materials/" + id + "/deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Deny failed");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error");
    }
    setBusy(null);
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
        <p className="text-slate-500 text-sm">No requests in this view.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {requests.map((req) => {
        const isExpanded = expanded.has(req.id);
        const photo = req.photos[0];

        return (
          <div key={req.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-3 md:p-4 flex gap-3">
              {photo?.signedUrl && (
                <button
                  onClick={() => toggleExpand(req.id)}
                  className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden bg-slate-100"
                >
                  <img src={photo.signedUrl} alt="" className="w-full h-full object-cover" />
                </button>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 break-words">
                      {req.itemName}
                      <span className="ml-2 text-sm font-normal text-slate-600 whitespace-nowrap">
                        × {req.qty}
                        {req.unit ? " " + req.unit : ""}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 break-words">
                      <Link href={"/tm/admin/jobs/" + req.job.id} className="hover:underline">
                        {req.job.customerName}
                      </Link>
                      {" · "}
                      {req.requestedBy.name}
                      {" · "}
                      {new Date(req.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                {req.notes && (
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2 break-words">
                    {req.notes}
                  </p>
                )}

                {req.status === "pending" && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      onClick={() => approve(req.id)}
                      disabled={busy === req.id}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {busy === req.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => deny(req.id)}
                      disabled={busy === req.id}
                      className="text-xs bg-white hover:bg-red-50 text-red-700 border border-red-200 font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      Deny
                    </button>
                    <button
                      onClick={() => toggleExpand(req.id)}
                      className="text-xs text-slate-600 hover:text-slate-900 px-2 py-1.5"
                    >
                      {isExpanded ? "Hide details" : "Details"}
                    </button>
                  </div>
                )}

                {req.status === "denied" && req.deniedReason && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 mt-2 break-words">
                    Denied: {req.deniedReason}
                  </div>
                )}

                {req.status === "approved" && req.approvedBy && (
                  <div className="text-xs text-emerald-700 mt-2">
                    ✓ Approved by {req.approvedBy.name}
                  </div>
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-100 p-3 md:p-4 bg-slate-50 space-y-3">
                {photo?.signedUrl && (
                  <img
                    src={photo.signedUrl}
                    alt="Material"
                    className="w-full rounded-lg max-h-96 object-contain bg-white"
                  />
                )}
                <div className="text-xs text-slate-600 space-y-1 break-words">
                  <div>
                    <strong>Job address:</strong> {req.job.jobAddress}
                  </div>
                  {photo?.distanceFromJobMiles !== null &&
                    photo?.distanceFromJobMiles !== undefined && (
                      <div>
                        <strong>GPS distance:</strong>{" "}
                        {photo.distanceFromJobMiles.toFixed(2)} mi from job site
                      </div>
                    )}
                  {req.notes && (
                    <div>
                      <strong>Notes:</strong> {req.notes}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    approved: "bg-emerald-100 text-emerald-800",
    denied: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={
        "shrink-0 inline-block text-xs font-medium px-2 py-0.5 rounded " +
        (styles[status] || "bg-slate-100 text-slate-700")
      }
    >
      {status}
    </span>
  );
}
