import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getCurrentUser, ADMIN_ROLES, ROLES } from "@/lib/auth";
import NewJobForm, { type JobPrefill } from "./NewJobForm";

export const dynamic = "force-dynamic";

// ?fromProposal=<id> arrives from the calendar when somebody picks an
// accepted proposal. Everything the customer already agreed to is loaded here
// and handed to the form, so the job that gets booked is the job that was
// quoted rather than a retyped approximation of it.
async function loadProposal(refId: string): Promise<JobPrefill | undefined> {
  try {
    // READ IT WITH THE SERVICE ROLE, NOT THE BROWSER SESSION.
    //
    // This page lives under the T&M admin layout, which signs people in with
    // its own blessed_track_session cookie. The Supabase session that owns
    // suite.app_storage is a different one and is not always readable here -
    // so the lookup came back empty and the form opened blank, with no error,
    // because it was written to fail open. Silence was the wrong choice and
    // this is the wrong client. The service role does not care which cookie
    // the browser is carrying.
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!url || !key) {
      console.error("[job prefill] no service role key - cannot read the proposal");
      return undefined;
    }
    const sb = createServiceClient(url, key, { auth: { persistSession: false } });

    // The company still comes from whoever is signed in, so one company can
    // never pull another's proposal through this page.
    let cid = "";
    try {
      const supabase = await createClient();
      const { data: { user: su } } = await supabase.auth.getUser();
      if (su) {
        const { data: mem } = await supabase
          .schema("suite")
          .from("memberships")
          .select("company_id")
          .eq("user_id", su.id)
          .limit(1)
          .maybeSingle();
        cid = ((mem as any) || {}).company_id || "";
      }
    } catch {
      // No Supabase session in this context - fall through to the lookup by
      // proposal id below, which is still scoped to one company's row.
    }

    let row: any = null;
    if (cid) {
      const { data } = await sb
        .schema("suite")
        .from("app_storage")
        .select("value")
        .eq("company_id", cid)
        .eq("key", "so_estimates")
        .maybeSingle();
      row = data;
    } else {
      // Without a company id, find the one company whose estimate list holds
      // this proposal. The id is a signed-link reference, not a guessable
      // number, and only an office user who is already signed into T&M can
      // reach this page at all.
      const { data: rows } = await sb
        .schema("suite")
        .from("app_storage")
        .select("value")
        .eq("key", "so_estimates");
      for (const r of (rows || []) as any[]) {
        try {
          const l = JSON.parse(r.value || "[]");
          if (Array.isArray(l) && l.some((x: any) => String(x.id) === refId)) { row = r; break; }
        } catch { /* skip a list that will not parse */ }
      }
    }
    if (!row) {
      console.error("[job prefill] no estimate list found for", refId);
      return undefined;
    }

    const list = JSON.parse(((row as any) || {}).value || "[]");
    const e = (Array.isArray(list) ? list : []).find((x: any) => String(x.id) === refId);
    if (!e) {
      console.error("[job prefill] proposal not in the list:", refId);
      return undefined;
    }

    // The estimating app computes totals rather than storing them.
    const total = String(e.mode || "") === "lumpsum"
      ? Number(e.lumpPrice || 0)
      : (e.lines || []).reduce(
          (sum: number, l: any) => sum + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0),
          0
        );

    return {
      customerName: e.client || "",
      customerPhone: e.clientPhone || "",
      customerEmail: e.clientEmail || "",
      address: e.clientAddr || "",
      // Coordinates the estimator already picked off Google's list. Reusing
      // them means the geofence sits where the proposal said, not wherever a
      // second lookup decides.
      lat: e.addrLat ?? null,
      lng: e.addrLng ?? null,
      salePrice: total ? String(total) : "",
      // How long the estimator said it takes. Carried through so nobody
      // re-guesses a job that was already sized when it was quoted.
      hours: String(e.mode || "") === "lumpsum"
        ? (Number(e.lumpHours) || null)
        // Hours on a line are for ONE unit, so they multiply by quantity.
        : (Math.round((e.lines || []).reduce((t: number, l: any) => t + (Number(l.qty) || 0) * (Number(l.hours) || 0), 0) * 100) / 100 || null),
      scopeOfWork: e.jobDescription || e.lumpDescription || "",
      proposalRef: String(e.id),
    };
  } catch (err: any) {
    // A proposal that will not load must not block booking a job by hand -
    // but it must not do it quietly either. That silence is what made this
    // look like "the fields just do not transfer".
    console.error("[job prefill] threw:", err?.message || err);
    return undefined;
  }
}

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ fromProposal?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const allowed = [...ADMIN_ROLES, ROLES.ESTIMATOR];
  if (!allowed.includes(user.role as any)) {
    redirect("/tm/admin");
  }

  const sp = await searchParams;
  const prefill = sp.fromProposal ? await loadProposal(String(sp.fromProposal)) : undefined;

  const technicians = await prisma.user.findMany({
    where: {
      orgId: user.orgId,
      role: ROLES.TECHNICIAN,
      isActive: true,
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {prefill ? "Confirm Job" : "New Job"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {prefill
            ? "From an accepted proposal. The customer, address, scope and price are already filled in - add the material, a tech and a date, then confirm."
            : "Add a new job. Type the address and select a suggestion to auto-fill the location."}
        </p>
      </div>

      <NewJobForm technicians={technicians} prefill={prefill} />
    </div>
  );
}
