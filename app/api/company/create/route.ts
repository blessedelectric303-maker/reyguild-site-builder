import { NextRequest, NextResponse } from "next/server";
import { createClient as createUserClient } from "@/utils/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

// Turns a bare Supabase login into a working company.
//
// Signing up gives you an account and nothing else - no company, no T and M
// organisation, and no link between them. Before this route that gap was
// filled by hand with SQL, which is exactly why there could only ever be one
// customer.
//
// Four things happen, and the cleanup below makes them all-or-nothing:
//   1. a T and M Organization
//   2. a suite.companies row
//   3. tm_org_id joining the two, so /tm/enter never has to guess
//   4. a suite.memberships row putting you in it

function service() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error("Server is not configured. Set SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  const supabase = await createUserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  let companyName = "";
  let yourName = "";
  let phone = "";
  let actingAs = "owner";
  try {
    const b = await req.json();
    companyName = String(b.companyName || "").trim();
    yourName = String(b.yourName || "").trim();
    phone = String(b.phone || "").trim();
    actingAs = b.actingAs === "admin" ? "admin" : "owner";
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  if (companyName.length < 2) {
    return NextResponse.json({ error: "Enter your company name." }, { status: 400 });
  }
  if (yourName.length < 2) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }

  let sb;
  try {
    sb = service();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  // Already on a company? Say so rather than making a second one. A refreshed
  // tab or a double tap must not be able to create two companies.
  const { data: existing } = await sb
    .schema("suite")
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing && (existing as any).company_id) {
    return NextResponse.json({ ok: true, already: true });
  }

  const companyId = crypto.randomUUID();
  const orgId = "org_" + crypto.randomUUID();

  try {
    await prisma.organization.create({
      data: {
        id: orgId,
        name: companyName,
        tradeType: "electrical",
        ownerName: yourName,
        phone: phone || null,
        subscriptionStatus: "trial",
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Could not create your workspace. Try again." },
      { status: 500 }
    );
  }

  const { error: coErr } = await sb.schema("suite").from("companies").insert({
    id: companyId,
    name: companyName,
    tm_org_id: orgId,
  });

  if (coErr) {
    // Two databases, so there is no single transaction to roll back. The
    // cleanup is explicit instead, and runs before anybody sees an error.
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    return NextResponse.json(
      { error: "Could not create your company: " + coErr.message },
      { status: 500 }
    );
  }

  const { error: memErr } = await sb.schema("suite").from("memberships").insert({
    id: crypto.randomUUID(),
    company_id: companyId,
    user_id: user.id,
    role: actingAs,
  });

  if (memErr) {
    await sb.schema("suite").from("companies").delete().eq("id", companyId);
    await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    return NextResponse.json(
      { error: "Could not add you to the company: " + memErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, companyId, orgId, role: actingAs });
}
