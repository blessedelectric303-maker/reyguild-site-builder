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
          position: "relative",
          overflow: "hidden",
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
    .select("name,phone,email,website,address,city,state,zip,area,logo")
    .eq("id", claim.companyId)
    .maybeSingle();

  // The business letterhead the office fills in under Settings. This is what
  // a customer should see at the top of a proposal - the same heading that
  // goes on a printed one.
  const { data: profRow } = await sb
    .schema("suite")
    .from("app_storage")
    .select("value")
    .eq("company_id", claim.companyId)
    .eq("key", "so_profile")
    .maybeSingle();

  let prof: any = {};
  try {
    prof = JSON.parse(((profRow as any) || {}).value || "{}") || {};
  } catch {
    prof = {};
  }

  const { data: rows } = await sb
    .schema("suite")
    .from("app_storage")
    .select("value")
    .eq("company_id", claim.companyId)
    .eq("key", "so_estimates")
    .maybeSingle();

  const wantedRef = claim.refId;
  const wantedCompany = claim.companyId;

  function findIn(raw: any): any {
    try {
      const list = JSON.parse(((raw as any) || {}).value || "[]");
      return list.find((e: any) => String(e.id) === wantedRef) || null;
    } catch {
      return null;
    }
  }

  let est: any = findIn(rows);

  // One retry, a second later. The write and the email leave at almost the
  // same moment; a customer on a fast connection can arrive between them.
  if (!est) {
    await new Promise((r) => setTimeout(r, 1200));
    const { data: again } = await sb
      .schema("suite")
      .from("app_storage")
      .select("value")
      .eq("company_id", wantedCompany)
      .eq("key", "so_estimates")
      .maybeSingle();
    est = findIn(again);
  }

  const { data: already } = await sb
    .schema("suite")
    .from("proposal_responses")
    .select("response,responded_at")
    .eq("company_id", claim.companyId)
    .eq("ref_id", claim.refId)
    .maybeSingle();

  // COMMAND CENTER IS THE LETTERHEAD NOW. The company profile at /company is
  // the one record; the old "so_profile" copy is kept only as a fallback for
  // companies that filled that in before the two were merged. Without this
  // the customer's page showed a blank letterhead while the office's own
  // preview showed a full one - the same company, two different documents.
  const coRow: any = co || {};
  const cityLine = [coRow.city, [coRow.state, coRow.zip].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const coAddress = [coRow.address, cityLine].filter(Boolean).join(", ");

  const company = String(coRow.name || "").trim() || String(prof.name || "").trim() || "your contractor";
  const logoUrl = String(coRow.logo || prof.logo || "").trim();
  const companyEmail = String(coRow.email || prof.email || "").trim();
  const website = String(coRow.website || prof.website || "").trim();
  const addressLine = String(coAddress || prof.address || "").trim();
  const phone = String(coRow.phone || prof.phone || "").trim();

  if (!est) {
    return (
      <Shell>
        <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Proposal not found</h1>
        <p style={{ color: "#64748b", lineHeight: 1.6 }}>
          If you have only just been sent it, wait a moment and open the link
          again. Otherwise it may have been withdrawn or replaced - give {company} a call
          {phone ? " on " + phone : ""} and they will sort it out.
        </p>
      </Shell>
    );
  }

  // THE OFFICE HEARS THAT IT WAS OPENED - ONCE.
  //
  // A proposal opened at nine at night and not answered is worth a phone call
  // in the morning. The same alert on every refresh is noise the office would
  // learn to ignore, so the email_log row goes in FIRST and its unique index
  // is what guarantees one email: a second open is refused by the database
  // before any mail is sent, not by logic that could race itself.
  if (est && est.notifyOnOpen !== false) {
    try {
      const { error: logErr } = await sb.schema("suite").from("email_log").insert({
        company_id: claim.companyId,
        kind: "proposal_opened",
        ref_id: claim.refId,
        stage: 0,
        to_email: companyEmail || "",
        subject: "Your proposal was opened",
        ok: true,
      });
      const resendKey = process.env.RESEND_API_KEY;
      if (!logErr && resendKey && companyEmail) {
        const who = String(est.client || "The customer");
        const what = String(est.jobDescription || est.lumpDescription || "").slice(0, 120);
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + resendKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "ReyGuild <noreply@reyguild.com>",
            to: [companyEmail],
            subject: who + " opened your proposal",
            html:
              '<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;color:#1e293b;max-width:520px;margin:0 auto;padding:24px">' +
              "<p><strong>" + who + "</strong> has just opened " +
              (est.estimateNo ? "proposal #" + est.estimateNo : "your proposal") +
              (what ? " for " + what : "") + ".</p>" +
              "<p>They have not answered it yet. This is the moment a call lands best.</p>" +
              '<p style="font-size:12px;color:#64748b">You are told once per proposal, not on every visit. Turn this off for a proposal before you send it.</p>' +
              "</div>",
          }),
        });
      }
    } catch {
      // The customer is reading their proposal. Nothing about telling the
      // office may get in the way of that.
    }
  }

  // Sixty days is a term in the contract they were sent, so an old link gets a
  // plain explanation rather than a dead button.
  const sentAt = est.sentAt ? Date.parse(est.sentAt) : 0;
  const days = sentAt ? Math.floor((Date.now() - sentAt) / 86400000) : 0;
  const expired = days > 60;

  const lines = Array.isArray(est.lines) ? est.lines : [];
  const isLump = String(est.mode || "") === "lumpsum";

  // The app computes totals rather than storing them (recSub in the estimating
  // app). Reading est.total gave undefined, which is why this page showed
  // $0.00 on a real proposal. Mirror the same rule here.
  const subtotal = isLump
    ? Number(est.lumpPrice || 0)
    : lines.reduce((s: number, l: any) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);

  // The contractor chooses per job whether the customer sees a price on every
  // line or one figure at the end. Default to one figure.
  const showLinePrices = String(est.priceDisplay || "total") === "lines";

  const proposalPhotos = (est.photos || []).filter((p: any) => String(p.stage || "proposal") !== "completion");
  const completionPhotos = (est.photos || []).filter((p: any) => String(p.stage || "") === "completion");

  const laborText = String(prof.laborMaterials || "").trim() ||
    "Labor and material are both included in every line item above. Nothing is billed separately after the fact.";

  // THE APP DOES NOT STORE THESE UNTIL SOMEBODY EDITS THEM. It falls back to
  // a default at render time, so a company that never opened Settings has a
  // blank stored value and a full warranty on its own preview. Reading the
  // stored value alone dropped both sections off the customer's copy - the
  // same text has to fall back the same way here.
  const warrantyText = String(prof.warranty || "").trim() ||
    `ONE-YEAR WORKMANSHIP WARRANTY

${company} warrants all work we service for a period of one (1) year from the date of completion. During this period we will repair or correct any defect in our workmanship at no additional charge.

This warranty covers the labor and workmanship on services we performed. It does not cover damage from misuse, alteration or repair by others, normal wear and tear, or conditions beyond our control.`;
  const contractText = String(prof.contract || "").trim() ||
    `SERVICE AGREEMENT

This Agreement is between ${company} ("Company") and the client identified on this proposal ("Client").

1. SCOPE. Company will perform the work described in this proposal.

2. PAYMENT TERMS. Payment is due Net 15 days from the invoice date. Balances not paid within 15 days may accrue a late charge as permitted by law.

3. COLLECTION & LEGAL COSTS. If any amount is not paid when due and the matter is referred to a third party for collection or legal action, Client agrees to pay all third-party costs of collection, including collection-agency fees, court costs, and reasonable attorney's fees.

4. WARRANTY. Completed work is covered by Company's one (1) year workmanship warranty, provided separately.

5. CHANGES. Any change to the scope of work must be agreed in writing and may adjust the price.

6. ACCEPTANCE. Client's signature on, or written approval of, this proposal constitutes acceptance of these terms.

${company}`;

  // Each section is included or left off per job, chosen on the estimate form
  // before sending. Default to on - a document with no terms on it is the
  // riskier accident.
  const showLabor = est.includeLabor !== false;
  const showWarranty = est.includeWarranty !== false;
  const showContract = est.includeContract !== false;

  const RULE = "1px solid #d4d4d4";
  const sectionTitle = {
    fontSize: 13, fontWeight: 700, letterSpacing: "0.04em",
    textTransform: "uppercase" as const, color: "#111", margin: 0,
  };
  const bodyText = { fontSize: 13.5, lineHeight: 1.65, color: "#333", whiteSpace: "pre-wrap" as const, margin: "6px 0 0" };

  function Row({ title, note, price }: { title: string; note?: string; price?: string }) {
    return (
      <div style={{ borderBottom: RULE, padding: "14px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
          <div style={sectionTitle}>{title}</div>
          {price ? <div style={{ fontSize: 13.5, color: "#111", whiteSpace: "nowrap" }}>{price}</div> : null}
        </div>
        {note ? <p style={bodyText}>{note}</p> : null}
      </div>
    );
  }

  function Photos({ label, list }: { label: string; list: any[] }) {
    if (!list.length) return null;
    return (
      <div style={{ borderBottom: RULE, padding: "14px 0" }}>
        <div style={sectionTitle}>{label}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {list.map((ph: any, i: number) => (
            <img key={i} src={ph.url || ph.data || ph} alt=""
                 style={{ width: 150, height: 150, objectFit: "cover", border: RULE }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Shell>
      {/* The company's own crest, faint, behind the page. This is their
          document - it carries their brand, not ours. Black and white
          everywhere else so it prints the way it looks. */}
      {logoUrl ? (
        <div aria-hidden style={{
          position: "absolute", inset: 0, display: "flex",
          alignItems: "center", justifyContent: "center",
          opacity: 0.04, pointerEvents: "none", overflow: "hidden",
        }}>
          <img src={logoUrl} alt="" style={{ width: "78%", maxWidth: 460 }} />
        </div>
      ) : null}

      <div style={{ position: "relative" }}>
        {/* ---- letterhead ---------------------------------------------- */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            {logoUrl ? (
              <img src={logoUrl} alt={company} style={{ height: 58, width: "auto", display: "block", marginBottom: 10 }} />
            ) : null}
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>{company}</div>
            {/* Every line is optional on purpose. A company that does not want
                its address on a document sent to strangers simply leaves it
                blank in Command Center and nothing renders here. */}
            {addressLine ? <div style={{ fontSize: 12.5, color: "#555" }}>{addressLine}</div> : null}
            {phone ? <div style={{ fontSize: 12.5, color: "#555" }}>{phone}</div> : null}
            {companyEmail ? <div style={{ fontSize: 12.5, color: "#555" }}>{companyEmail}</div> : null}
            {website ? <div style={{ fontSize: 12.5, color: "#555" }}>{website}</div> : null}
          </div>
          <div style={{ textAlign: "right", fontSize: 12.5, color: "#555" }}>
            <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888" }}>Prepared for</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginTop: 2 }}>{est.client || "Customer"}</div>
            {est.clientAddr ? <div style={{ marginTop: 2 }}>{est.clientAddr}</div> : null}
            <div style={{ marginTop: 10 }}>
              {est.estimateNo ? <div>Proposal #{est.estimateNo}</div> : null}
              {est.date ? <div>{est.date}</div> : null}
            </div>
          </div>
        </div>

        <div style={{ borderBottom: "2px solid #111", margin: "18px 0 0" }} />

        {/* ---- the job ------------------------------------------------- */}
        <div style={{ borderBottom: RULE, padding: "14px 0" }}>
          <div style={sectionTitle}>Description</div>
          <p style={bodyText}>
            {est.jobDescription || est.lumpDescription || "The work we discussed"}
          </p>
        </div>

        {/* ---- line items ---------------------------------------------- */}
        {isLump ? (
          <Row
            title={est.lumpDescription || "The work described above"}
            price={showLinePrices ? money(est.lumpPrice) : undefined}
          />
        ) : (
          lines
            .filter((l: any) => String(l.name || "").trim())
            .map((l: any, i: number) => (
              <Row
                key={i}
                title={String(l.name)}
                note={Number(l.qty) > 1 ? "Quantity: " + l.qty : undefined}
                price={showLinePrices ? money((Number(l.qty) || 0) * (Number(l.unitPrice) || 0)) : undefined}
              />
            ))
        )}

        {/* Notes the estimator wrote for the customer. */}
        {String(est.notes || "").trim() ? (
          <div style={{ borderBottom: RULE, padding: "14px 0" }}>
            <div style={sectionTitle}>Notes</div>
            <p style={bodyText}>{String(est.notes)}</p>
          </div>
        ) : null}

        {/* These three carry no price on purpose. They are part of what the
            customer is buying, at no separate charge, and saying so plainly
            is worth more than a row of $0.00. */}
        {showLabor ? <Row title="Labor &amp; materials included" note={laborText} /> : null}
        {showWarranty ? <Row title="Warranty" note={warrantyText} /> : null}
        {showContract ? <Row title="Contract agreement" note={contractText} /> : null}

        <Photos label="Proposal photos" list={proposalPhotos} />
        <Photos label="Completion photos" list={completionPhotos} />

        {/* ---- the only money on the page ------------------------------ */}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "18px 0 6px" }}>
          <div style={{ minWidth: 240 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, color: "#555" }}>
              <span>Subtotal</span><span>{money(subtotal)}</span>
            </div>
            <div style={{ borderTop: "2px solid #111", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Total</span>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{money(subtotal)}</span>
            </div>
          </div>
        </div>

        {/* ---- answer -------------------------------------------------- */}
        <div style={{ marginTop: 18 }}>
          {already ? (
            <div style={{
              background: "#f5f5f5", border: RULE, borderRadius: 6, padding: 16,
              fontSize: 14, lineHeight: 1.6,
            }}>
              <strong>
                {(already as any).response === "accepted"
                  ? "You have already approved this proposal."
                  : "You have already declined this proposal."}
              </strong>
              <br />
              {(already as any).response === "accepted"
                ? company + " has been told and will be in touch to book it in."
                : "Thank you for letting us know."}
              {phone ? " If that was a mistake, call " + phone + "." : ""}
            </div>
          ) : expired ? (
            <div style={{ background: "#f5f5f5", border: RULE, borderRadius: 6, padding: 16, fontSize: 14, lineHeight: 1.6 }}>
              <strong>This proposal has expired.</strong>
              <br />
              Prices hold for sixty days and this one was sent {days} days ago.
              {phone ? " Call " + phone + " and we will re-quote it for you." : ""}
            </div>
          ) : (
            <Respond token={token} company={company} phone={phone} total={money(subtotal)} />
          )}
        </div>

        <div style={{ marginTop: 26, paddingTop: 14, borderTop: RULE }}>
          <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, color: "#333" }}>
            Thank you,<br />
            <strong>{company}</strong><br />
            <span style={{ color: "#666" }}>We look forward to your business.</span>
          </p>
        </div>
      </div>
    </Shell>
  );
}
