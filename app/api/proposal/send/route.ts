import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { signProposal } from "@/lib/proposalToken";

export const dynamic = "force-dynamic";

// SEND A PROPOSAL, NOW.
//
// The follow-up cron chases a proposal on day 3, 7 and 12 - but nothing ever
// sent the thing in the first place. An estimator built it, pressed save, and
// the customer never heard. The accept link, the follow-ups and the whole
// cycle through to a scheduled job all wait on this one email.
//
// It uses the same signed link the follow-ups use, so a customer who accepts
// from this email and a customer who accepts from the day 7 reminder land on
// exactly the same page and are recorded the same way.

export async function POST(req: NextRequest) {
  let refId = "", to = "", clientName = "", total = "", description = "";
  try {
    const b = await req.json();
    refId = String(b.refId || "");
    to = String(b.to || "").trim();
    clientName = String(b.clientName || "").trim();
    total = String(b.total || "");
    description = String(b.description || "").trim();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (!refId) return NextResponse.json({ error: "Which proposal?" }, { status: 400 });
  if (!to || !to.includes("@")) {
    return NextResponse.json(
      { error: "This proposal has no customer email. Add one and save first." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const companyId = ((mem as any) || {}).company_id;
  if (!companyId) {
    return NextResponse.json({ error: "You are not on a company." }, { status: 400 });
  }

  const { data: co } = await supabase
    .schema("suite")
    .from("companies")
    .select("name,phone,email")
    .eq("id", companyId)
    .maybeSingle();
  const companyName = ((co as any) || {}).name || "your contractor";
  const companyPhone = ((co as any) || {}).phone || "";

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Email is not set up yet. RESEND_API_KEY is missing." },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tm.serviceopspro.com";
  const link = appUrl + "/p/" + signProposal(companyId, refId);
  const from = process.env.EMAIL_FROM || "ReyGuild <noreply@reyguild.com>";

  // Plain, short, and the button is the point. A proposal email that reads
  // like marketing gets treated like marketing.
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
      <p style="font-size:16px;margin:0 0 14px">Hello${clientName ? " " + clientName : ""},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 14px">
        Here is the proposal from <strong>${companyName}</strong>${description ? " for " + description : ""}.
      </p>
      ${total ? `<p style="font-size:22px;font-weight:700;margin:0 0 18px">${total}</p>` : ""}
      <a href="${link}"
         style="display:inline-block;background:#0F6E56;color:#fff;text-decoration:none;
                padding:14px 22px;border-radius:8px;font-weight:700;font-size:16px">
        View and accept this proposal
      </a>
      <p style="font-size:13px;line-height:1.6;color:#64748b;margin:20px 0 0">
        Accepting takes one tap and there is nothing to sign up for.
        ${companyPhone ? "Questions first? Call " + companyPhone + " - there is no rush." : ""}
      </p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "Your proposal from " + companyName,
        html,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: "The email did not send. " + detail.slice(0, 180) },
        { status: 502 }
      );
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Could not reach the mail service." }, { status: 502 });
  }

  // Recorded so the follow-ups know the clock has started, and so the same
  // proposal is not sent twice by two people.
  try {
    await supabase.schema("suite").from("email_log").insert({
      company_id: companyId,
      kind: "proposal",
      ref_id: refId,
      stage: 0,
      to_email: to,
      subject: "Your proposal",
      ok: true,
    });
  } catch {
    // The customer has the email; a missing log line must not look like a
    // failure to the person who pressed send.
  }

  return NextResponse.json({ ok: true, sentTo: to });
}
