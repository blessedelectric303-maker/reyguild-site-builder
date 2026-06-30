import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Invoicing from "./Invoicing";

export default async function EstimatingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ent } = await supabase
    .schema("suite")
    .from("entitlements")
    .select("status")
    .eq("app_key", "estimating")
    .maybeSingle();

  const ok = ent && (ent.status === "active" || ent.status === "trialing");
  if (!ok) redirect("/");

  return (
    <div className="min-h-screen">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
        <Link href="/" className="text-sm text-slate-300 hover:text-white">
          ← Back to command center
        </Link>
        <div className="text-sm font-extrabold">
          <span style={{ color: "#e0a82e" }}>REY</span>
          <span className="text-white">GUILD</span>
        </div>
      </div>
      <Invoicing />
    </div>
  );
}
