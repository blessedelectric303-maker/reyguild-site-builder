import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DocumentBody from "@/components/DocumentBody";

export const dynamic = "force-dynamic";

// The public copies. These have to be readable by somebody who has not signed
// up yet - you cannot ask a person to agree to terms they can only see after
// they agree to them.
//
// Short friendly URLs on the outside, document keys on the inside.
const PUBLIC: Record<string, string> = {
  terms: "rg-terms",
  privacy: "rg-privacy",
  cookies: "rg-cookies",
};

export default async function LegalPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const docKey = PUBLIC[key];
  if (!docKey) notFound();

  let doc: any = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.schema("suite").rpc("document_body", { p_key: docKey });
    doc = data && data.length ? data[0] : null;
  } catch (e) {
    doc = null;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div className="text-lg font-extrabold tracking-wide">
            <span style={{ color: "#CC9000" }}>REY</span>
            <span className="text-white">GUILD</span>
          </div>
          <nav className="flex gap-4 text-xs text-slate-400">
            <Link href="/legal/terms" className="hover:text-white">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/legal/cookies" className="hover:text-white">Cookies</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {!doc ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            This page has not been published yet. Contact
            support@reyguild.com for a copy.
          </p>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900">{doc.title}</h1>
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
              <DocumentBody body={doc.body || ""} />
            </div>
          </>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          ReyGuild &middot; Denver, Colorado
        </p>
      </div>
    </main>
  );
}
