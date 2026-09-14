import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyProposal } from "@/lib/proposalToken";

export const dynamic = "force-dynamic";

// Records a customer's answer. Writing this row does three things at once:
// it is the evidence, it is what stops the follow-up emails, and it is what
// raises the notification telling the office to get the job on the calendar.

export async function POST(req: NextRequest) {
  let token = "";
  let response = "";
  let reason = "";
  try {
    const b = await req.json();
    token = String(b.token || "");
    response = String(b.response || "");
    reason = String(b.reason || "").slice(0, 2000);
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (response !== "accepted" && response !== "declined") {
    return NextResponse.json({ error: "Unknown response." }, { status: 400 });
  }

  const claim = verifyProposal(token);
  if (!claim) {
    return NextResponse.json({ error: "This link is not valid." }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    return NextResponse.json({ error: "Temporarily unavailable." }, { status: 500 });
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0].trim() : req.headers.get("x-real-ip");

  const { error } = await sb.schema("suite").from("proposal_responses").insert({
    company_id: claim.companyId,
    ref_id: claim.refId,
    response,
    reason: reason || null,
    ip_address: ip,
    user_agent: req.headers.get("user-agent"),
  });

  if (error) {
    // The unique index refused it, which means this proposal was already
    // answered. The first answer stands - a forwarded link does not get to
    // overwrite it - and the customer is told plainly rather than shown a
    // failure they cannot act on.
    if (String(error.code) === "23505") {
      return NextResponse.json(
        { error: "This proposal has already been answered. Call the office if that was a mistake." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "That did not save. Please try again." }, { status: 500 });
  }

  // THE ACCEPT HAS TO REACH THE JOB QUEUE.
  // Recording the response was only half of it. T&M's "Needs a date" screen
  // lists proposals whose status is "approved", and nothing ever set that -
  // so an accepted proposal sat at "Submitted" forever and the job was never
  // offered for scheduling. Everything downstream of this (calendar, tech,
  // supervisor) was waiting on a status that never changed.
  //
  // so_estimates is one JSON document holding every proposal, so this is a
  // read-modify-write. If an estimator saves in the same instant, one of the
  // two writes wins. Rare with a small crew, and worth knowing about.
  if (response === "accepted") {
    try {
      const { data: row } = await sb
        .schema("suite")
        .from("app_storage")
        .select("value")
        .eq("company_id", claim.companyId)
        .eq("key", "so_estimates")
        .maybeSingle();
      const list = JSON.parse(((row as any) || {}).value || "[]");
      let touched = false;
      const next = (Array.isArray(list) ? list : []).map((e: any) => {
        if (String(e.id) !== claim.refId) return e;
        touched = true;
        return { ...e, status: "approved", acceptedAt: new Date().toISOString() };
      });
      if (touched) {
        const { error: upErr } = await sb
          .schema("suite")
          .from("app_storage")
          .upsert(
            {
              company_id: claim.companyId,
              key: "so_estimates",
              value: JSON.stringify(next),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "company_id,key" }
          );
        if (upErr) console.error("[respond] could not mark approved:", upErr.message);
      } else {
        console.error("[respond] no estimate matched refId", claim.refId);
      }
    } catch (e: any) {
      // The customer's answer is already recorded and that is the part that
      // must not fail. A status that did not flip is recoverable by hand.
      console.error("[respond] approve step failed:", e && e.message);
    }
  }

  return NextResponse.json({ ok: true });
}
