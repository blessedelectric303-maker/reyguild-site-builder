import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, ADMIN_ROLES } from "@/lib/auth";
import AbsenceManager from "./AbsenceManager";

export const dynamic = "force-dynamic";

// Three unexcused absences in ninety days is the threshold being watched.
export const WINDOW_DAYS = 90;
export const THRESHOLD = 3;

export default async function AbsencesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/tm/enter");
  if (!ADMIN_ROLES.includes(me.role as any)) redirect("/tm/tech");

  const since = new Date();
  since.setDate(since.getDate() - WINDOW_DAYS);

  const users = await prisma.user.findMany({
    where: { orgId: me.orgId, isActive: true },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });

  const notices = await prisma.absenceNotice.findMany({
    where: { user: { orgId: me.orgId }, absenceDate: { gte: since } },
    orderBy: { absenceDate: "desc" },
    select: {
      id: true, userId: true, absenceDate: true, excused: true,
      reason: true, notes: true, submittedAt: true,
    },
  });

  const rows = users.map((u) => {
    const mine = notices.filter((n) => n.userId === u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      unexcused: mine.filter((n) => !n.excused).length,
      recent: mine.slice(0, 8).map((n) => ({
        id: n.id,
        date: n.absenceDate.toISOString().slice(0, 10),
        excused: n.excused,
        reason: n.reason || "",
        notes: n.notes || "",
      })),
    };
  });

  return <AbsenceManager rows={rows} windowDays={WINDOW_DAYS} threshold={THRESHOLD} />;
}
