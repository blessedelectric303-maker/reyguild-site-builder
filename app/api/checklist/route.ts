import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Checklist progress saves here as the admin works. Ticking IS the record;
// nobody fills in a second form afterwards.

export const dynamic = "force-dynamic";

async function me() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: mem } = await supabase
    .schema("suite")
    .from("memberships")
    .select("company_id,role")
    .limit(1)
    .maybeSingle();
  const companyId = (mem as any)?.company_id || "";
  if (!companyId) return null;
  return { supabase, userId: user.id, companyId };
}

// Reopen whatever was left unfinished for this color.
export async function GET(req: Request) {
  const ctx = await me();
  if (!ctx) return NextResponse.json({ run: null });
  const color = new URL(req.url).searchParams.get("color") || "";
  if (!color) return NextResponse.json({ run: null });

  const { data } = await ctx.supabase
    .schema("suite")
    .from("checklist_runs")
    .select("id,answers")
    .eq("company_id", ctx.companyId)
    .eq("color", color)
    .is("closed_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ run: data || null });
}

export async function POST(req: Request) {
  const ctx = await me();
  if (!ctx) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const b = await req.json().catch(() => ({}));
  const answers = b.answers || {};
  const color = String(b.color || "");
  const now = new Date().toISOString();

  let runId = b.runId || null;

  if (runId) {
    await ctx.supabase
      .schema("suite")
      .from("checklist_runs")
      .update({ answers, updated_at: now })
      .eq("id", runId);
  } else {
    const { data, error } = await ctx.supabase
      .schema("suite")
      .from("checklist_runs")
      .insert({
        company_id: ctx.companyId,
        color,
        procedure_id: b.procedureId || null,
        answers,
        started_by: ctx.userId,
      })
      .select("id")
      .maybeSingle();
    if (error) return NextResponse.json({ error: "Could not save the checklist." }, { status: 500 });
    runId = (data as any)?.id || null;
  }

  // "Estimate to schedule" - write the call record, then hand the id to
  // Proposals so nothing gets retyped.
  if (b.handoff) {
    const a = answers as Record<string, any>;
    const { data: call, error } = await ctx.supabase
      .schema("suite")
      .from("calls")
      .insert({
        company_id: ctx.companyId,
        call_type: color,
        caller_name: a.caller_name || null,
        phone: a.caller_phone || null,
        email: a.caller_email || null,
        address: a.service_address || null,
        need: a.situation || null,
        details: answers,
        taken_by: ctx.userId,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Could not save this call." }, { status: 500 });
    }

    const callId = (call as any)?.id || null;
    if (callId && runId) {
      await ctx.supabase
        .schema("suite")
        .from("checklist_runs")
        .update({ call_id: callId, updated_at: now })
        .eq("id", runId);
    }
    return NextResponse.json({ id: runId, callId });
  }

  return NextResponse.json({ id: runId });
}
