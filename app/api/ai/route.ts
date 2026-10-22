import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { canAccess } from "@/utils/roles";
import { hasAppAccess } from "@/lib/entitlements";
import { rateLimit } from "@/lib/rate-limit";
import { callReyguildAi, ReyguildAiError } from "@/lib/reyguild-ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 20000) {
      return NextResponse.json({ error: "Your outline is too long." }, { status: 413 });
    }
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

    const body = await request.json().catch(() => null);
    if (!body || (body.task !== "proposal" && body.task !== "assistant") || typeof body.input !== "string" || !body.input.trim() || body.input.length > 10000) {
      return NextResponse.json({ error: "Enter an outline or question of up to 10,000 characters." }, { status: 400 });
    }
    const { data: membership, error: membershipError } = await supabase
      .schema("suite").from("memberships").select("company_id,role")
      .eq("user_id", user.id).limit(1).maybeSingle();
    if (membershipError) return NextResponse.json({ error: "Could not check company access. Try again." }, { status: 503 });
    if (!membership?.company_id || !membership.role) return NextResponse.json({ error: "Join or set up your company first." }, { status: 403 });

    const appKey = body.task === "proposal" ? "estimating" : "time_material";
    if (!canAccess(membership.role, appKey)) return NextResponse.json({ error: "Your role cannot use this feature." }, { status: 403 });
    const { data: entitlements, error: entitlementError } = await supabase
      .schema("suite").from("entitlements").select("status,trial_ends_at")
      .eq("user_id", user.id).eq("app_key", appKey);
    if (entitlementError) return NextResponse.json({ error: "Could not check subscription access. Try again." }, { status: 503 });
    if (!hasAppAccess(entitlements)) return NextResponse.json({ error: "Your trial or subscription does not currently include this app." }, { status: 403 });

    if (process.env.REYGUILD_AI_ENABLED !== "true") {
      return NextResponse.json({ error: "AI is not enabled for this workspace yet. Ask the owner to finish setup." }, { status: 503 });
    }
    // Per-instance protection, in addition to the provider's account spending limit.
    const limit = rateLimit("ai:" + user.id, 20, 60 * 60 * 1000);
    if (!limit.ok) return NextResponse.json({ error: "AI usage limit reached. Try again later." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });

    const { data: company, error: companyError } = await supabase.schema("suite").from("companies")
      .select("name,trade").eq("id", membership.company_id).maybeSingle();
    if (companyError || !company) return NextResponse.json({ error: "Could not load your company. Try again." }, { status: 503 });
    const result = await callReyguildAi(
      { key: process.env.AI_GATEWAY_API_KEY, model: process.env.REYGUILD_AI_MODEL },
      body.task,
      body.input.trim(),
      { name: String(company.name || "").slice(0, 200), trade: String(company.trade || "").slice(0, 100) },
    );
    return NextResponse.json({ ok: true, result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ReyguildAiError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[reyguild-ai] request failed");
    return NextResponse.json({ error: "AI could not complete this request. Your text has not been changed." }, { status: 500 });
  }
}
