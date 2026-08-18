"use client";

import { useState } from "react";

export default function AuditExportButton({
  tab,
  before,
}: {
  tab: string;
  before?: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      const params = new URLSearchParams();
      if (tab && tab !== "all") params.set("tab", tab);
      if (before) params.set("before", before);
      const qs = params.toString();
      const url = "/api/admin/audit/export" + (qs ? "?" + qs : "");

      const res = await fetch(url);
      if (!res.ok) {
        alert("Export failed. Please try again.");
        return;
      }
      const blob = await res.blob();
      const filename =
        res.headers.get("Content-Disposition")?.match(/filename="([^"]+)"/)?.[1] ||
        "audit-log.csv";

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={busy}
      className="text-sm bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium px-3 py-1.5 rounded-lg disabled:opacity-50"
    >
      {busy ? "Exporting…" : "Export CSV"}
    </button>
  );
}
