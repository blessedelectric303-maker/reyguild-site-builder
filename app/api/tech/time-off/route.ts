import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSickLeaveBalance } from "@/lib/sick-leave";

const createSchema = z.object({
  type: z.enum(["vacation", "sick", "personal"]),
  startDate: z.string(),
  endDate: z.string(),
  duration: z.enum(["full_day", "half_day", "custom"]),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  reason: z.string().min(3).max(1000),
});

function parseDateOnly(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000)) + 1;
}

function parseHHMM(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { h: hh, m: mm };
}

export async function POST(req: Request) {
  try {
    const actor = await getCurrentUser();
    if (!actor) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (!actor.isActive) {
      return NextResponse.json(
        { error: "Your account is inactive. Contact your administrator." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request. Please fill all fields." },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const startDate = parseDateOnly(data.startDate);
    const endDate = parseDateOnly(data.endDate);
    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Invalid date format." }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be on or after start date." },
        { status: 400 }
      );
    }

    const numDays = daysBetween(startDate, endDate);
    const isMultiDay = numDays > 1;

    let hoursRequested = 0;

    if (data.duration === "full_day") {
      hoursRequested = numDays * 8;
    } else if (data.duration === "half_day") {
      hoursRequested = numDays * 4;
    } else if (data.duration === "custom") {
      if (isMultiDay) {
        return NextResponse.json(
          { error: "Custom times are only allowed for single-day requests." },
          { status: 400 }
        );
      }
      if (!data.startTime || !data.endTime) {
        return NextResponse.json(
          { error: "Custom times require start time and end time." },
          { status: 400 }
        );
      }
      const st = parseHHMM(data.startTime);
      const et = parseHHMM(data.endTime);
      if (!st || !et) {
        return NextResponse.json(
          { error: "Invalid time format. Use HH:MM." },
          { status: 400 }
        );
      }
      const startMins = st.h * 60 + st.m;
      const endMins = et.h * 60 + et.m;
      if (endMins <= startMins) {
        return NextResponse.json(
          { error: "End time must be after start time." },
          { status: 400 }
        );
      }
      hoursRequested = Math.round(((endMins - startMins) / 60) * 100) / 100;
    }

    if (hoursRequested <= 0 || hoursRequested > 999) {
      return NextResponse.json(
        { error: "Invalid number of hours requested." },
        { status: 400 }
      );
    }

    let warning: string | null = null;
    if (data.type === "sick") {
      const bal = await getSickLeaveBalance(actor.id, actor.orgId);
      if (hoursRequested > bal.available) {
        warning =
          "This request is " +
          hoursRequested.toFixed(1) +
          "h but you only have " +
          bal.available.toFixed(1) +
          "h of accrued sick leave available. The request will still be sent for approval.";
      }
    }

    const created = await prisma.timeOffRequest.create({
      data: {
        id: "tor_" + crypto.randomUUID(),
        orgId: actor.orgId,
        requesterUserId: actor.id,
        startDate,
        endDate,
        duration: data.duration,
        startTime: data.duration === "custom" ? data.startTime : null,
        endTime: data.duration === "custom" ? data.endTime : null,
        hoursRequested,
        isMultiDay,
        type: data.type,
        reason: data.reason.trim(),
        status: "pending",
      },
    });

    await prisma.auditLog.create({
      data: {
        id: "audit_" + crypto.randomUUID(),
        orgId: actor.orgId,
        actorUserId: actor.id,
        actorRole: actor.role,
        actionType: "time_off_requested",
        targetTable: "TimeOffRequest",
        targetId: created.id,
        fieldChanged: null,
        oldValue: null,
        newValue: data.type + " " + hoursRequested + "h" + (warning ? " (over sick balance)" : ""),
      },
    });

    return NextResponse.json({ ok: true, id: created.id, warning });
  } catch (err) {
    console.error("Create time off request error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
