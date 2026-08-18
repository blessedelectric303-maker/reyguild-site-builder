"use client";
import { useState } from "react";
import Link from "next/link";

type Entry = {
  id: string;
  createdAt: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  targetTable: string;
  targetId: string;
  fieldChanged: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  archive_job: "Archived job",
  restore_job: "Restored job",
  delete_job: "Permanently deleted job",
  edit_time_entry: "Edited time entry",
  delete_time_entry: "Deleted time entry",
  admin_clock_out: "Clocked tech out",
  approve_material: "Approved material request",
  deny_material: "Denied material request",
  create_purchase: "Logged purchase",
  edit_purchase: "Edited purchase",
  delete_purchase: "Deleted purchase",
  log_purchase: "Logged purchase",
  log_other_job_cost: "Logged other job cost",
  edit_other_job_cost: "Edited other job cost",
  delete_other_job_cost: "Deleted other job cost",
  edit_assignment_rate: "Changed tech rate",
  create_user: "Created user",
  edit_user: "Edited user",
  deactivate_user: "Deactivated user",
};

const ACTION_COLORS: Record<string, string> = {
  archive_job: "bg-amber-100 text-amber-800",
  restore_job: "bg-blue-100 text-blue-800",
  delete_job: "bg-red-100 text-red-700",
  edit_time_entry: "bg-amber-100 text-amber-800",
  delete_time_entry: "bg-red-100 text-red-700",
  admin_clock_out: "bg-amber-100 text-amber-800",
  approve_material: "bg-emerald-100 text-emerald-800",
  deny_material: "bg-red-100 text-red-700",
  create_purchase: "bg-emerald-100 text-emerald-800",
  edit_purchase: "bg-amber-100 text-amber-800",
  delete_purchase: "bg-red-100 text-red-700",
  log_purchase: "bg-emerald-100 text-emerald-800",
  log_other_job_cost: "bg-emerald-100 text-emerald-800",
  edit_other_job_cost: "bg-amber-100 text-amber-800",
  delete_other_job_cost: "bg-red-100 text-red-700",
  edit_assignment_rate: "bg-amber-100 text-amber-800",
  create_user: "bg-emerald-100 text-emerald-800",
  edit_user: "bg-amber-100 text-amber-800",
  deactivate_user: "bg-red-100 text-red-700",
};

function targetLink(table: string, id: string): string | null {
  if (table === "Job") return "/tm/admin/jobs/" + id;
  if (table === "User") return "/tm/admin/users";
  if (table === "MaterialRequest") return "/tm/admin/materials";
  return null;
}

function prettyJson(value: string | null): string {
  if (!value) return "—";
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

export default function AuditLogRow({ entry }: { entry: Entry }) {
  const [open, setOpen] = useState(false);
  const label = ACTION_LABELS[entry.actionType] || entry.actionType;
  const color = ACTION_COLORS[entry.actionType] || "bg-slate-100 text-slate-700";
  const link = targetLink(entry.targetTable, entry.targetId);
  const when = new Date(entry.createdAt);
  const hasDetail = entry.oldValue || entry.newValue || entry.fieldChanged;

  return (
    <li className="px-3 md:px-5 py-3 hover:bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left flex items-start gap-2 md:gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                "inline-block text-xs font-medium px-2 py-0.5 rounded " + color
              }
            >
              {label}
            </span>
            <span className="text-sm text-slate-700">
              by <span className="font-medium">{entry.actorName}</span>{" "}
              <span className="text-xs text-slate-400">({entry.actorRole})</span>
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {when.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            ·{" "}
            {when.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
          {entry.reason && (
            <div className="text-xs text-slate-600 mt-1 italic break-words">
              &quot;{entry.reason}&quot;
            </div>
          )}
        </div>
        <div className="text-xs text-slate-400 shrink-0 pt-0.5">
          {hasDetail ? (open ? "▾" : "▸") : ""}
        </div>
      </button>

      {open && (
        <div className="mt-3 pl-3 border-l-2 border-slate-200 space-y-2">
          <div className="text-xs text-slate-500 break-all">
            <span className="font-medium">Target:</span> {entry.targetTable}{" "}
            <span className="font-mono">{entry.targetId.slice(0, 16)}…</span>
            {link && (
              <Link href={link} className="ml-2 text-brand-600 hover:underline">
                Open →
              </Link>
            )}
          </div>
          {entry.fieldChanged && (
            <div className="text-xs text-slate-500">
              <span className="font-medium">Field:</span> {entry.fieldChanged}
            </div>
          )}
          {(entry.oldValue || entry.newValue) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div>
                <div className="font-medium text-slate-500 mb-1">Before</div>
                <pre className="bg-red-50 border border-red-100 rounded p-2 text-slate-700 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {prettyJson(entry.oldValue)}
                </pre>
              </div>
              <div>
                <div className="font-medium text-slate-500 mb-1">After</div>
                <pre className="bg-emerald-50 border border-emerald-100 rounded p-2 text-slate-700 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                  {prettyJson(entry.newValue)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
