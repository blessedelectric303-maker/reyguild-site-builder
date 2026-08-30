import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DocumentBody from "@/components/DocumentBody";
import SignBlock from "@/components/SignBlock";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function OnboardingDocumentPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  let doc: any = null;
  try {
    const { data } = await supabase.schema("suite").rpc("document_body", { p_key: key });
    doc = data && data.length ? data[0] : null;
  } catch (e) {
    doc = null;
  }

  const suggested =
    (user.user_metadata && (user.user_metadata as any).full_name) || "";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <Logo dark size={24} />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 pb-12">
        <Link href="/onboarding" className="text-sm text-slate-500 underline">
          &larr; Back to the list
        </Link>

        {!doc ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-600">
            That document has not been loaded yet.
          </p>
        ) : (
          <>
            <h1 className="mt-3 text-xl font-bold leading-tight text-slate-900">
              {doc.title}
            </h1>
            {doc.summary ? (
              <p className="mt-1 text-sm text-slate-500">{doc.summary}</p>
            ) : null}

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <DocumentBody body={doc.body || ""} />
            </div>

            {doc.requires_signature ? (
              <SignBlock
                docKey={doc.doc_key}
                title={doc.title}
                alreadySigned={!!doc.signed}
                signedAt={doc.signed_at}
                signedName={doc.typed_name}
                suggestedName={suggested}
                backHref="/onboarding"
              />
            ) : (
              <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-500">
                Nothing to sign on this page.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
