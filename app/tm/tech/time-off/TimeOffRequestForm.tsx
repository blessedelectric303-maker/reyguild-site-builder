"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function todayISODate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function daysBetween(startISO: string, endISO: string): number {
  if (!startISO || !endISO) return 0;
  const s = new Date(startISO + "T12:00:00").getTime();
  const e = new Date(endISO + "T12:00:00").getTime();
  if (isNaN(s) || isNaN(e) || e < s) return 0;
  return Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1;
}

function calcCustomHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const sParts = /^(\d{1,2}):(\d{2})$/.exec(start);
  const eParts = /^(\d{1,2}):(\d{2})$/.exec(end);
  if (!sParts || !eParts) return 0;
  const sMin = Number(sParts[1]) * 60 + Number(sParts[2]);
  const eMin = Number(eParts[1]) * 60 + Number(eParts[2]);
  if (eMin <= sMin) return 0;
  return Math.round(((eMin - sMin) / 60) * 100) / 100;
}

export default function TimeOffRequestForm({
  sickAvailable,
}: {
  sickAvailable: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"vacation" | "sick" | "personal">("vacation");
  const [startDate, setStartDate] = useState(todayISODate());
  const [endDate, setEndDate] = useState(todayISODate());
  const [duration, setDuration] = useState<"full_day" | "half_day" | "custom">(
    "full_day"
  );
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmWarning, setConfirmWarning] = useState<string | null>(null);

  const numDays = daysBetween(startDate, endDate);
  const isMultiDay = numDays > 1;

  const totalHours = useMemo(() => {
    if (duration === "full_day") return numDays * 8;
    if (duration === "half_day") return numDays * 4;
    if (duration === "custom" && !isMultiDay) return calcCustomHours(startTime, endTime);
    return 0;
  }, [duration, numDays, startTime, endTime, isMultiDay]);

  const overSick = type === "sick" && totalHours > sickAvailable;

  function reset() {
    setType("vacation");
    setStartDate(todayISODate());
    setEndDate(todayISODate());
    setDuration("full_day");
    setStartTime("09:00");
    setEndTime("13:00");
    setReason("");
    setError(null);
    setConfirmWarning(null);
  }

  function onChangeStart(v: string) {
    setStartDate(v);
    if (new Date(endDate) < new Date(v)) setEndDate(v);
  }

  function onChangeEnd(v: string) {
    setEndDate(v);
    const days = daysBetween(startDate, v);
    if (days > 1 && duration === "custom") setDuration("full_day");
  }

  async function submit() {
    setError(null);
    if (numDays < 1) {
      setError("End date must be on or after start date.");
      return;
    }
    if (totalHours <= 0) {
      setError("Total hours must be greater than zero. Check the times entered.");
      return;
    }
    if (reason.trim().length < 3) {
      setError("Please give a brief reason (at least 3 characters).");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/tech/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          startDate,
          endDate,
          duration,
          startTime: duration === "custom" ? startTime : undefined,
          endTime: duration === "custom" ? endTime : undefined,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit.");
        setLoading(false);
        return;
      }
      reset();
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
        onClick={() => setOpen(true)}
        className="w-full bg-white border-2 border-slate-900 hover:bg-slate-100 text-slate-900 font-bold px-4 py-3 rounded-xl"
      >
        + Request Time Off
      </button>
    );
  }return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <h2 className="font-semibold text-slate-900">New time off request</h2>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"
        >
          <option value="vacation">Vacation</option>
          <option value="sick">Sick</option>
          <option value="personal">Personal</option>
        </select>
        {type === "sick" && (
          <div className="text-xs text-slate-500 mt-1">
            Sick available: {sickAvailable.toFixed(1)}h
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Start date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => onChangeStart(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            End date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onChangeEnd(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          How much time? {numDays > 1 ? "(" + numDays + " days)" : ""}
        </label>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="duration"
              checked={duration === "full_day"}
              onChange={() => setDuration("full_day")}
            />
            Full day{numDays > 1 ? "s" : ""} ({numDays * 8}h)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="duration"
              checked={duration === "half_day"}
              onChange={() => setDuration("half_day")}
            />
            Half day{numDays > 1 ? "s" : ""} ({numDays * 4}h)
          </label>
          <label
            className={
              "flex items-center gap-2 text-sm " +
              (isMultiDay ? "text-slate-400" : "")
            }
          >
            <input
              type="radio"
              name="duration"
              checked={duration === "custom"}
              onChange={() => setDuration("custom")}
              disabled={isMultiDay}
            />
            Custom times (single day only)
          </label>
        </div>
      </div>

      {duration === "custom" && !isMultiDay && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Start time
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              End time
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
            />
          </div>
        </div>
      )}

      <div className="bg-brand-50 border border-brand-200 rounded-lg p-3 text-sm">
        Total: <span className="font-semibold">{totalHours.toFixed(1)}h</span>
      </div>

      {overSick && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          This is {totalHours.toFixed(1)}h but you only have {sickAvailable.toFixed(1)}h
          of accrued sick leave. You can still submit it for approval.
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Reason
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Family vacation, doctor appointment, etc."
          rows={2}
          maxLength={1000}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
        />
      </div>

      {error && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "Submitting..." : overSick ? "Submit anyway" : "Submit request"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          disabled={loading}
          className="bg-white hover:bg-slate-100 text-slate-700 font-medium px-4 py-2 rounded-lg border border-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
