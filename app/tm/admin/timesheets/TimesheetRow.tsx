"use client";
import { useState } from "react";
import Link from "next/link";

type EntrySummary = {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  totalMinutes: number | null;
  laborCost: number;
  jobId: string;
  jobCustomer: string;
  isActive: boolean;
};

type Group = {
  userId: string;
  userName: string;
  userRole: string;
  hourlyWage: number | null;
  totalMinutes: number;
  totalLaborCost: number;
  totalWagesOwed: number;
  totalOverheadKept: number;
  completedEntryCount: number;
  activeEntryCount: number;
  entries: EntrySummary[];
};

function EntriesList({
  entries,
  canSeeMoney,
}: {
  entries: EntrySummary[];
  canSeeMoney: boolean;
}) {
  return (
    <ul className="divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
      {entries.map((e) => {
        const inDate = new Date(e.clockInAt);
        const outDate = e.clockOutAt ? new Date(e.clockOutAt) : null;
        const hours = e.totalMinutes ? (e.totalMinutes / 60).toFixed(2) : null;
        return (
          <li
            key={e.id}
            className="px-3 py-2 flex items-start justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm text-slate-900 break-words">
                {inDate.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                <span className="text-slate-400">·</span>{" "}
                {inDate.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {outDate
                  ? " – " +
                    outDate.toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : ""}
                {e.isActive && (
                  <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                    Active
                  </span>
                )}
              </div>
              <Link
                href={"/tm/admin/jobs/" + e.jobId}
                className="text-xs text-brand-600 hover:underline break-words"
              >
                {e.jobCustomer} →
              </Link>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-medium text-slate-900">
                {hours ? hours + "h" : "—"}
              </div>
              {canSeeMoney && e.laborCost > 0 && (
                <div className="text-xs text-slate-500">
                  ${e.laborCost.toFixed(2)} charged
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function TimesheetRow({
  group,
  canSeeMoney,
}: {
  group: Group;
  canSeeMoney: boolean;
}) {
  const [open, setOpen] = useState(false);
  const totalHours = (group.totalMinutes / 60).toFixed(1);
  const totalEntries = group.completedEntryCount + group.activeEntryCount;
  const wageMissing = group.hourlyWage === null;

  return (
    <>
      {/* Mobile: card */}
      <div className="md:hidden bg-white rounded-xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full text-left p-4 hover:bg-slate-50 active:bg-slate-100"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900 truncate">
                {group.userName}
              </div>
              <div className="text-xs text-slate-500 capitalize mt-0.5">
                {group.userRole}
              </div>
              {group.activeEntryCount > 0 && (
                <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {group.activeEntryCount} active
                </span>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-bold text-slate-900">
                {totalHours}h
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
              </div>
            </div>
          </div>

          {canSeeMoney && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-slate-500 uppercase tracking-wide">
                  Charged
                </div>
                <div className="font-semibold text-slate-900 mt-0.5">
                  ${group.totalLaborCost.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-blue-700 uppercase tracking-wide">
                  Wages
                </div>
                <div className="font-semibold text-blue-700 mt-0.5">
                  ${group.totalWagesOwed.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-emerald-700 uppercase tracking-wide">
                  Overhead
                </div>
                <div className="font-semibold text-emerald-700 mt-0.5">
                  ${group.totalOverheadKept.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {canSeeMoney && wageMissing && (
            <div className="mt-2 text-xs text-amber-700">
              ⚠️ No wage set — using cost rate for payroll.
            </div>
          )}

          <div className="text-xs text-brand-600 mt-2">
            {open ? "▾ Hide entries" : "▸ Show entries"}
          </div>
        </button>
        {open && (
          <div className="border-t border-slate-200 p-3 bg-slate-50">
            <EntriesList entries={group.entries} canSeeMoney={canSeeMoney} />
          </div>
        )}
      </div>

      {/* Desktop: table rows */}
      <tr
        className="hidden md:table-row hover:bg-slate-50 cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <td className="px-5 py-3 text-center text-slate-400">
          {open ? "▾" : "▸"}
        </td>
        <td className="px-5 py-3">
          <div className="font-medium text-slate-900">{group.userName}</div>
          <div className="text-xs text-slate-500">{group.userRole}</div>
          {group.activeEntryCount > 0 && (
            <span className="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-800">
              {group.activeEntryCount} active
            </span>
          )}
          {canSeeMoney && wageMissing && (
            <div className="text-xs text-amber-700 mt-1">⚠️ No wage set</div>
          )}
        </td>
        <td className="px-5 py-3 text-right font-medium text-slate-900">
          {totalHours}h
        </td>
        {canSeeMoney && (
          <>
            <td className="px-5 py-3 text-right font-medium text-slate-900">
              ${group.totalLaborCost.toFixed(2)}
            </td>
            <td className="px-5 py-3 text-right font-medium text-blue-700">
              ${group.totalWagesOwed.toFixed(2)}
            </td>
            <td className="px-5 py-3 text-right font-medium text-emerald-700">
              ${group.totalOverheadKept.toFixed(2)}
            </td>
          </>
        )}
        <td className="px-5 py-3 text-right text-sm text-slate-600">
          {totalEntries}
        </td>
      </tr>
      {open && (
        <tr className="hidden md:table-row bg-slate-50">
          <td colSpan={canSeeMoney ? 7 : 4} className="px-5 py-3">
            <EntriesList entries={group.entries} canSeeMoney={canSeeMoney} />
          </td>
        </tr>
      )}
    </>
  );
}
