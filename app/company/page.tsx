import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import CompanyForm from "./CompanyForm";

export default async function CompanyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.schema("suite").rpc("ensure_company");

  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("role,company_id")
    .limit(1)
    .maybeSingle();

  const role = (mem as any)?.role || "owner";
  const companyId = (mem as any)?.company_id;
  if (!companyId || !(role === "owner" || role === "admin")) redirect("/");

  const { data: company } = await supabase
    .schema("suite")
    .from("companies")
    .select("name,trade,phone,area,email,website,logo")
    .eq("id", companyId)
    .maybeSingle();

  const c = (company as any) || {};

  return (
    <CompanyForm
      companyId={companyId}
      initial={{
        name: c.name || "",
        trade: c.trade || "",
        phone: c.phone || "",
        area: c.area || "",
        email: c.email || "",
        website: c.website || "",
        logo: c.logo || "",
      }}
    />
  );
}
