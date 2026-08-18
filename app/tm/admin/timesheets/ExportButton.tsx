"use client";

export default function ExportButton({ weekParam }: { weekParam: string }) {
  function download() {
    const url = "/api/admin/timesheets/export?week=" + encodeURIComponent(weekParam);
    window.location.href = url;
  }
  return (
    <button
      type="button"
      onClick={download}
      className="text-sm bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium px-3 py-1.5 rounded-lg"
    >
      ↓ Export CSV
    </button>
  );
}
