import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { buildTokenMap, fillTokens, type CompanyFacts } from "@/utils/tokens";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// THE DAILY FOLLOW-UP RUN
//
// Wakes once a day, walks every company, and sends whatever is due:
//
//   Proposals   day 3, 7, 12   until accepted, rejected, invoiced or archived
//   Invoices    day 7, 14      until paid or archived
//   Admin       day 14         one alert telling the owner to CALL, not email
//
// Sending exactly once is guaranteed by a unique index in suite.email_log, not
// by logic in here. If this route runs twice, or Vercel retries it, or two
// instances wake in the same minute, the second insert is refused by the
// database and no customer gets the same reminder twice.
//
// The log row is written BEFORE the send. A logged email that failed to send
// is a missing email; a sent email that failed to log is a duplicate next run.
// Missing is the better failure, so the log goes first.

const STAGES = {
  proposal: [3, 7, 12],
  invoice: [7, 14],
};

const TEMPLATE_KEY: Record<string, string> = {
  "proposal:3": "email-proposal-3",
  "proposal:7": "email-proposal-7",
  "proposal:12": "email-proposal-12",
  "invoice:7": "email-invoice-7",
  "invoice:14": "email-invoice-14",
  "admin:14": "email-admin-unpaid-14",
};

function service() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient(url, key, { auth: { persistSession: false } });
}

function daysSince(iso: string): number {
  if (!iso) return -1;
  const t = Date.parse(iso);
  if (isNaN(t)) return -1;
  return Math.floor((Date.now() - t) / 86400000);
}

function money(n: any): string {
  const v = Number(n || 0);
  return "$" + v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function firstName(full: string): string {
  return String(full || "").trim().split(/\s+/)[0] || "there";
}

// The stored templates use [TOKEN] the same way the procedures and contracts
// do, so the same filler handles both the company facts and the per-document
// values. Anything unresolved stays as a visible bracket rather than a blank.
function render(text: string, tokens: Record<string, string>): string {
  return fillTokens(text || "", tokens);
}

function asHtml(body: string, facts: CompanyFacts): string {
  const name = String(facts.name || "");
  const phone = String(facts.phone || "");
  const email = String(facts.email || "");
  const logo = String((facts as any).logo || "");

  const paragraphs = body
    .split(/\n\s*\n/)
    .map((block) => {
      const t = block.trim();
      if (!t) return "";
      const html = t
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>");
      if (t.startsWith("- ")) {
        const items = t
          .split("\n")
          .filter((l) => l.trim().startsWith("- "))
          .map((l) => "<li>" + l.trim().slice(2).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>") + "</li>")
          .join("");
        return '<ul style="margin:0 0 14px;padding-left:20px">' + items + "</ul>";
      }
      return '<p style="margin:0 0 14px;line-height:1.6">' + html + "</p>";
    })
    .join("");

  // The letterhead. The owner never configures this - it is built from the
  // company profile they already filled in.
  return [
    '<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;color:#1e293b;max-width:600px;margin:0 auto;padding:24px">',
    '<div style="border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:20px">',
    logo ? '<img src="' + logo + '" alt="" style="max-height:52px;width:auto;display:block;margin-bottom:8px">' : "",
    '<div style="font-size:19px;font-weight:700;color:#0f172a">' + name + "</div>",
    '<div style="font-size:12px;color:#64748b">' + [phone, email].filter(Boolean).join(" &middot; ") + "</div>",
    "</div>",
    paragraphs,
    '<div style="border-top:1px solid #e2e8f0;margin-top:24px;padding-top:12px;font-size:11px;color:#94a3b8">',
    "Sent by " + name + " through ReyGuild. Reply to this email to reach them directly.",
    "</div></div>",
  ].join("");
}

export async function GET(req: NextRequest) {
  // Vercel signs its cron calls. A CRON_SECRET means nobody else can make the
  // app email your customers by hitting a URL.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== "Bearer " + secret) {
      return NextResponse.json({ error: "Not authorised." }, { status: 401 });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY is not set." }, { status: 500 });
  }
  const resend = new Resend(resendKey);

  let sb;
  try {
    sb = service();
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const FROM = process.env.EMAIL_FROM || "ReyGuild <noreply@reyguild.com>";
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://tm.serviceopspro.com";

  // The templates, once, for everybody.
  const { data: tpls } = await sb
    .schema("suite")
    .from("documents")
    .select("doc_key,summary,body")
    .eq("kind", "email")
    .is("company_id", null);

  const T: Record<string, { subject: string; body: string }> = {};
  (tpls || []).forEach((t: any) => {
    T[t.doc_key] = { subject: t.summary || "", body: t.body || "" };
  });

  const { data: companies } = await sb
    .schema("suite")
    .from("companies")
    .select("id,name,phone,email,website,address,city,state,zip,owner_name,trade,logo,settings");

  let sent = 0;
  let skipped = 0;
  const problems: string[] = [];

  for (const co of (companies || []) as any[]) {
    const facts = co as CompanyFacts;
    const base = buildTokenMap(facts);

    const { data: rows } = await sb
      .schema("suite")
      .from("app_storage")
      .select("key,value")
      .eq("company_id", co.id)
      .in("key", ["so_estimates", "so_invoices"]);

    const store: Record<string, any[]> = {};
    (rows || []).forEach((r: any) => {
      try {
        store[r.key] = JSON.parse(r.value || "[]");
      } catch {
        store[r.key] = [];
      }
    });

    type Job = {
      kind: "proposal" | "invoice" | "admin";
      stage: number;
      to: string;
      tokens: Record<string, string>;
    };
    const queue: Job[] = [];

    // ---- PROPOSALS -------------------------------------------------------
    for (const e of store["so_estimates"] || []) {
      const status = String(e.status || "").toLowerCase();
      // Stop the moment there is an answer, either way. Chasing somebody who
      // already said yes is worse than not chasing at all.
      if (e.archived || e.invoiced || e.fuStopped) continue;
      if (status.includes("accept") || status.includes("reject") || status.includes("declin") || status.includes("won") || status.includes("lost")) continue;
      if (!e.sentAt) continue;

      const age = daysSince(e.sentAt);
      const due = STAGES.proposal.filter((d) => age >= d);
      if (!due.length) continue;
      const stage = due[due.length - 1];

      const to = String(e.clientEmail || e.email || "").trim();
      if (!to) {
        skipped++;
        continue;
      }

      queue.push({
        kind: "proposal",
        stage,
        to,
        tokens: {
          ...base,
          customer_first_name: firstName(e.clientContact || e.client || ""),
          customer_name: String(e.client || ""),
          job_summary: String(e.jobDescription || e.lumpDescription || "the work we discussed"),
          view_your_proposal: APP_URL + "/apps/estimating",
          ref_id: String(e.id || ""),
        },
      });
    }

    // ---- INVOICES --------------------------------------------------------
    for (const inv of store["so_invoices"] || []) {
      const status = String(inv.status || "").toLowerCase();
      const paid =
        status.includes("paid") ||
        (Array.isArray(inv.payments) && inv.payments.length > 0 && status.includes("paid"));
      if (inv.archived || paid) continue;
      if (!inv.sentAt) continue;

      const age = daysSince(inv.sentAt);
      const due = STAGES.invoice.filter((d) => age >= d);
      if (!due.length) continue;
      const stage = due[due.length - 1];

      const balance = money(inv.balance != null ? inv.balance : inv.total);
      const tokens = {
        ...base,
        customer_first_name: firstName(inv.clientContact || inv.client || ""),
        customer_name: String(inv.client || ""),
        customer_phone: String(inv.clientPhone || ""),
        invoice_number: String(inv.invoiceNo || inv.id || ""),
        job_summary: String(inv.lumpDescription || inv.notes || "the work completed"),
        balance_due: balance,
        payment_terms: String(inv.terms || "Net 7"),
        view_and_pay_your_invoice: APP_URL + "/apps/estimating",
        ref_id: String(inv.id || ""),
      };

      const to = String(inv.clientEmail || inv.email || "").trim();
      if (to) queue.push({ kind: "invoice", stage, to, tokens });
      else skipped++;

      // At fourteen days the OWNER gets told to pick up the phone. This goes
      // out whether or not the customer has an email address on file - in
      // fact it matters more when they do not.
      if (stage === 14) {
        const owner = String(co.email || "").trim();
        if (owner) queue.push({ kind: "admin", stage: 14, to: owner, tokens });
      }
    }

    // ---- SEND ------------------------------------------------------------
    for (const job of queue) {
      const tpl = T[TEMPLATE_KEY[job.kind + ":" + job.stage]];
      if (!tpl) continue;

      const subject = render(tpl.subject, job.tokens);
      const body = render(tpl.body, job.tokens);
      const refId = job.tokens.ref_id || "";

      // Log FIRST. The unique index turns a double run into a refused insert
      // rather than a second email.
      const { error: logErr } = await sb.schema("suite").from("email_log").insert({
        company_id: co.id,
        kind: job.kind,
        ref_id: refId,
        stage: job.stage,
        to_email: job.to,
        subject,
      });
      if (logErr) continue; // already sent, or already claimed by another run

      try {
        const result = await resend.emails.send({
          from: FROM,
          to: job.to,
          // The customer replies to the COMPANY, not to us. Sending as
          // ReyGuild keeps deliverability on a verified domain; reply-to
          // keeps the conversation where it belongs.
          replyTo: String(co.email || "") || undefined,
          subject,
          html: asHtml(body, facts),
          text: body.replace(/\*\*/g, ""),
        });
        if (result.error) {
          await sb
            .schema("suite")
            .from("email_log")
            .update({ ok: false, error: String(result.error.message || result.error) })
            .eq("company_id", co.id)
            .eq("kind", job.kind)
            .eq("ref_id", refId)
            .eq("stage", job.stage);
          problems.push(job.kind + " " + refId);
        } else {
          sent++;
        }
      } catch (err: any) {
        await sb
          .schema("suite")
          .from("email_log")
          .update({ ok: false, error: String(err?.message || err) })
          .eq("company_id", co.id)
          .eq("kind", job.kind)
          .eq("ref_id", refId)
          .eq("stage", job.stage);
        problems.push(job.kind + " " + refId);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    skipped_no_email: skipped,
    failed: problems.length,
  });
}
