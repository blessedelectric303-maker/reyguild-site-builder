import { createClient } from "@supabase/supabase-js";
import { verifyProposal } from "@/lib/proposalToken";
import Respond from "./Respond";

export const dynamic = "force-dynamic";

// The page a customer lands on from a follow-up email. No login - they are a
// homeowner, not a user, and asking them to make an account to say yes is how
// you lose the job.
//
// The token is signed, so a person can only ever open the one proposal that
// was sent to them.

function service() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function money(n: any): string {
  const v = Number(n || 0);
  return "$" + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ minHeight: "100vh", background: "#f8fafc", padding: "32px 16px" }}>
      <div
        style={{
          maxWidth: 620,
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 28,
          fontFamily: "-apple-system,Segoe UI,Roboto,Arial,sans-serif",
          color: "#1e293b",
        }}
      >
        {children}
      </div>
    </main>
  );
}

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const claim = verifyProposal(token);

  if (!claim) {
    return (
      <Shell>
        <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>This link is not valid</h1>
        <p style={{ color: "#64748b", lineHeight: 1.6, margin: 0 }}>
          It may have been copied incompletely. Try opening it from the original
          email, or reply to that email and we will send a fresh one.
        </p>
      </Shell>
    );
  }

  const sb = service();
  if (!sb) {
    return (
      <Shell>
        <h1 style={{ fontSize: 20, margin: 0 }}>Temporarily unavailable</h1>
        <p style={{ color: "#64748b" }}>Please try again shortly.</p>
      </Shell>
    );
  }

  const { data: co } = await sb
    .schema("suite")
    .from("companies")
    .select("name,phone,email")
    .eq("id", claim.companyId)
    .maybeSingle();

  const { data: rows } = await sb
    .schema("suite")
    .from("app_storage")
    .select("value")
    .eq("company_id", claim.companyId)
    .eq("key", "so_estimates")
    .maybeSingle();

  let est: any = null;
  try {
    const list = JSON.parse(((rows as any) || {}).value || "[]");
    est = list.find((e: any) => String(e.id) === claim.refId) || null;
  } catch {
    est = null;
  }

  const { data: already } = await sb
    .schema("suite")
    .from("proposal_responses")
    .select("response,responded_at")
    .eq("company_id", claim.companyId)
    .eq("ref_id", claim.refId)
    .maybeSingle();

  const company = ((co as any) || {}).name || "your contractor";
  const phone = ((co as any) || {}).phone || "";

  if (!est) {
    return (
      <Shell>
        <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Proposal not found</h1>
        <p style={{ color: "#64748b", lineHeight: 1.6 }}>
          It may have been withdrawn or replaced. Give {company} a call
          {phone ? " on " + phone : ""} and they will sort it out.
        </p>
      </Shell>
    );
  }

  // Sixty days is a term in the contract they were sent, so an old link gets a
  // plain explanation rather than a dead button.
  const sentAt = est.sentAt ? Date.parse(est.sentAt) : 0;
  const days = sentAt ? Math.floor((Date.now() - sentAt) / 86400000) : 0;
  const expired = days > 60;

  return (
    <Shell>
      <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{company}</div>
        {phone ? <div style={{ fontSize: 12, color: "#64748b" }}>{phone}</div> : null}
      </div>

      <h1 style={{ fontSize: 20, margin: "0 0 4px" }}>Your proposal</h1>
      <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 18px" }}>
        {est.jobDescription || est.lumpDescription || "The work we discussed"}
      </p>

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>
          Total
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#0f172a" }}>
          {money(est.total)}
        </div>
      </div>

      {already ? (
        <div
          style={{
            background: (already as any).response === "accepted" ? "#ecfdf5" : "#f1f5f9",
            border: "1px solid " + ((already as any).response === "accepted" ? "#6ee7b7" : "#cbd5e1"),
            borderRadius: 8,
            padding: 16,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong>
            {(already as any).response === "accepted"
              ? "You have already accepted this proposal."
              : "You have already declined this proposal."}
          </strong>
          <br />
          {(already as any).response === "accepted"
            ? company + " has been told and will be in touch to book it in."
            : "Thank you for letting us know."}
          {phone ? " If that was a mistake, call " + phone + "." : ""}
        </div>
      ) : expired ? (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fcd34d",
            borderRadius: 8,
            padding: 16,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          <strong>This proposal has expired.</strong>
          <br />
          Prices hold for sixty days and this one was sent {days} days ago.
          Material costs and scheduling have likely moved since.
          {phone ? " Call " + phone + " and we will re-quote it for you." : ""}
        </div>
      ) : (
        <Respond token={token} company={company} phone={phone} />
      )}

      <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 24, lineHeight: 1.5 }}>
        Accepting confirms the scope and price above and the Terms and
        Conditions supplied with this proposal.
      </p>
    </Shell>
  );
}
