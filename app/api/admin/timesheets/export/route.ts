import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, ROLES } from "@/lib/auth";
import { parseLaborCostFromNotes } from "@/lib/labor-cost";

const TZ = "America/Denver";

function getDenverOffsetHours(d: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "short",
  });
  const parts = dtf.formatToParts(d);
  const tz = parts.find((p) => p.type === "timeZoneName")?.value || "MST";
  return tz === "MDT" ? 6 : 7;
}

function parseWeekStart(weekParam: string | null): Date {
  if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
    const [y, m, d] = weekParam.split("-").map(Number);
    const norm = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    const offset = getDenverOffsetHours(norm);
    return new Date(Date.UTC(y, m - 1, d, offset, 0, 0));
  }
  // Default: current week start in Denver
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  });
  const parts = dtf.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const wMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = wMap[weekday] ?? 0;
  const norm = new Date(Date.UTC(year, month - 1, day - dow, 12, 0, 0));
  const offset = getDenverOffsetHours(norm);
  return new Date(
    Date.UTC(norm.getUTCFullYear(), norm.getUTCMonth(), norm.getUTCDate(), offset, 0, 0)
  );
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export async function GET(req: Request) {
  try {
    const user = await requireRole([ROLES.OWNER, ROLES.ADMIN]);
    const url = new URL(req.url);
    const weekParam = url.searchParams.get("week");
    const weekStart = parseWeekStart(weekParam);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const entries = await prisma.timeEntry.findMany({
      where: {
        job: { orgId: user.orgId },
        clockInAt: { gte: weekStart, lt: weekEnd },
        clockOutAt: { not: null },
      },
      include: {
        user: { select: { id: true, name: true } },
        job: { select: { customerName: true } },
      },
      orderBy: [{ userId: "asc" }, { clockInAt: "asc" }],
    });

    // Group by user
    type Row = {
      name: string;
      totalMinutes: number;
      totalLaborCost: number;
      entries: number;
    };
    const map = new Map<string, Row>();
    for (const e of entries) {
      let r = map.get(e.userId);
      if (!r) {
        r = { name: e.user.name, totalMinutes: 0, totalLaborCost: 0, entries: 0 };
        map.set(e.userId, r);
      }
      r.totalMinutes += e.totalMinutes || 0;
      r.totalLaborCost += parseLaborCostFromNotes(e.notes);
      r.entries += 1;
    }

    const weekStartIso = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(weekStart);

    const header = ["Technician", "Week Start", "Total Hours", "Total Labor Cost", "Entries"];
    const lines = [header.join(",")];
    const rows = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    for (const r of rows) {
      lines.push(
        [
          csvEscape(r.name),
          weekStartIso,
          (r.totalMinutes / 60).toFixed(2),
          r.totalLaborCost.toFixed(2),
          String(r.entries),
        ].join(",")
      );
    }
    const csv = lines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="timesheet-' + weekStartIso + '.csv"',
      },
    });
  } catch (err: any) {
    if (err?.message === "UNAUTHORIZED") return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    if (err?.message === "FORBIDDEN") return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    console.error("Timesheet export error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
