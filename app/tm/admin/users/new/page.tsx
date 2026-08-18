import { redirect } from "next/navigation";
import { getCurrentUser, ADMIN_ROLES } from "@/lib/auth";
import NewUserForm from "./NewUserForm";

export default async function NewUserPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!ADMIN_ROLES.includes(user.role as any)) {
    redirect("/tm/admin");
  }

  const isOwner = user.role === "owner";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Add Employee</h1>
        <p className="text-sm text-slate-500 mt-1">
          Create a new account. They'll be able to log in with the email and password you set here.
        </p>
      </div>

      <NewUserForm canCreateOwner={isOwner} canCreateAdmin={isOwner} />
    </div>
  );
}