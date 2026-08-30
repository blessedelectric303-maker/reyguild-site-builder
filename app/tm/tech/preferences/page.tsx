import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import TextSizePicker from "./TextSizePicker";

export const dynamic = "force-dynamic";

function roleLabel(role: string): string {
  if (role === "technician") return "Technician";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export default async function TechPreferencesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Preferences</h1>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Text size</div>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          Applies to every screen in this app, on this phone.
        </p>
        <TextSizePicker />
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Your details</div>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Name</dt>
            <dd className="text-slate-800">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
            <dd className="break-all text-slate-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Role</dt>
            <dd className="text-slate-800">{roleLabel(user.role)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-slate-500">
          These come from your company record. Ask the office to change them -
          that keeps your hours and your jobs attached to the right person.
        </p>
      </div>
    </div>
  );
}
