import { redirect } from "next/navigation";
import { getCurrentUser, ROLES, isOrgLocked } from "@/lib/auth";
import Link from "next/link";
import LogoutButton from "../admin/LogoutButton";
import HelpButton from "@/components/HelpButton";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
export default async function TechLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== ROLES.TECHNICIAN) {
    redirect("/tm/admin");
  }
  const locked = isOrgLocked(user.org);
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <Logo dark size={36} />
          </div>
          <div className="flex-1 min-w-0 text-center text-sm font-medium text-slate-200 truncate">
            {user.name}
          </div>
          <div className="flex-1 flex flex-col items-end gap-2">
            <div><HelpButton /></div>
            <div><LogoutButton /></div>
          </div>
        </div>
        <nav className="max-w-2xl mx-auto px-2 flex">
          <Link href="/tm/tech" className="flex-1 text-center py-2.5 text-sm font-medium text-slate-300 hover:text-white border-b-2 border-transparent hover:border-slate-500">Jobs</Link>
          <Link href="/tm/tech/my-hours" className="flex-1 text-center py-2.5 text-sm font-medium text-slate-300 hover:text-white border-b-2 border-transparent hover:border-slate-500">My Hours</Link>
          <Link href="/tm/tech/time-off" className="flex-1 text-center py-2.5 text-sm font-medium text-slate-300 hover:text-white border-b-2 border-transparent hover:border-slate-500">Time Off</Link>
        </nav>
      </header>
      {locked && (
        <div className="bg-red-600 text-white text-sm text-center px-4 py-2">
          Your company&apos;s subscription has lapsed. The app is read-only until
          it&apos;s reactivated — please contact your manager.
        </div>
      )}
      <main className="max-w-2xl mx-auto w-full px-4 py-4 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
