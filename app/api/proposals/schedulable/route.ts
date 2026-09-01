import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// Accepted proposals that could go on the calendar, with the ones already
// there flagged. The picker uses this so a person is never offered something
// the database will refuse a second later.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ items: [] });

  try {
    const { data, error } = await supabase
      .schema("suite")
      .rpc("schedulable_proposals");
    if (error) return NextResponse.json({ items: [] });

    // Pull the customer name and job description off the company's own
    // estimates, so the picker shows a person rather than an id.
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("company_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    const cid = ((mem as any) || {}).company_id;

    let estimates: any[] = [];
    if (cid) {
      const { data: row } = await supabase
        .schema("suite")
        .from("app_storage")
        .select("value")
        .eq("company_id", cid)
        .eq("key", "so_estimates")
        .maybeSingle();
      try {
        estimates = JSON.parse(((row as any) || {}).value || "[]");
      } catch {
        estimates = [];
      }
    }

    const items = (data || []).map((r: any) => {
      const e = estimates.find((x: any) => String(x.id) === String(r.ref_id));
      return {
        ref_id: r.ref_id,
        accepted_at: r.accepted_at,
        already_scheduled: r.already_scheduled,
        client: e ? e.client || e.clientContact || "" : "",
        address: e ? e.clientAddr || e.address || "" : "",
        description: e ? e.jobDescription || e.lumpDescription || "" : "",
        total: e ? e.total : null,
      };
    });

    return NextResponse.json({ items });
  } catch {
    // Not deployed yet. An empty list means the picker hides itself and the
    // calendar behaves exactly as it did before.
    return NextResponse.json({ items: [] });
  }
}
