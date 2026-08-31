import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DocumentBody from "@/components/DocumentBody";
import { companyTokensForCurrentUser } from "@/utils/companyTokens";

export const dynamic = "force-dynamic";

// A written procedure, on its own page. Same reader as the signed documents,
// minus the signature block - nobody signs a how-to.

export default async function GuidePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/guide/" + key);

  let doc: any = null;
  try {
    const { data } = await supabase.schema("suite").rpc("document_body", { p_key: key });
    doc = data && data.length ? data[0] : null;
  } catch (e) {
    doc = null;
  }

  const tokens = await companyTokensForCurrentUser();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/apps/estimating" className="text-sm text-slate-500 underline">
          &larr; Back to Proposals &amp; Invoicing
        </Link>

        {!doc ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            That guide has not been loaded yet. Your office needs to run the
            procedures file.
          </p>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-bold leading-tight text-slate-900">
              {doc.title}
            </h1>
            {doc.summary ? (
              <p className="mt-1 text-sm text-slate-500">{doc.summary}</p>
            ) : null}
            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
              <DocumentBody body={doc.body || ""} tokens={tokens} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
