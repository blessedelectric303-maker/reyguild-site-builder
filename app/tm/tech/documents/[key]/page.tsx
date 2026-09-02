import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import DocumentBody from "@/components/DocumentBody";
import { companyTokensForCurrentUser } from "@/utils/companyTokens";
import SignBlock from "@/components/SignBlock";
import DocumentEditor from "@/components/DocumentEditor";

export const dynamic = "force-dynamic";

export default async function TechDocumentPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let doc: any = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.schema("suite").rpc("document_body", { p_key: key });
    doc = data && data.length ? data[0] : null;
  } catch (e) {
    doc = null;
  }

  if (!doc) {
    return (
      <div>
        <p className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-600">
          That document has not been loaded yet. Nothing is broken - your office
          needs to add it.
        </p>
        <Link
          href="/tm/tech/documents"
          className="mt-4 block text-center text-sm text-slate-500 underline"
        >
          Back to Company Documents
        </Link>
      </div>
    );
  }

  // Who is reading, and whose copy of the document this is. An owner or
  // admin gets the editor; a tech never sees the button, because the database
  // would refuse them and a button that turns you away is worse than none.
  let canEditDoc = false;
  let isOurs = true;
  try {
    const supabase = await createClient();
    const {
      data: { user: su },
    } = await supabase.auth.getUser();
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role,company_id")
      .eq("user_id", su?.id || "")
      .limit(1)
      .maybeSingle();
    const r = ((mem as any) || {}).role || "";
    canEditDoc = r === "owner" || r === "admin";

    const cid = ((mem as any) || {}).company_id;
    if (cid) {
      const { data: own } = await supabase
        .schema("suite")
        .from("documents")
        .select("id")
        .eq("company_id", cid)
        .eq("doc_key", key)
        .maybeSingle();
      isOurs = !own;
    }
  } catch (e) {
    canEditDoc = false;
  }

  const tokens = await companyTokensForCurrentUser();

  return (
    <div className="pb-10">
      <Link href="/tm/tech/documents" className="text-sm text-slate-500 underline">
        &larr; Company Documents
      </Link>

      <h1 className="mt-3 text-xl font-bold leading-tight text-slate-900">{doc.title}</h1>
      {doc.summary ? (
        <p className="mt-1 text-sm text-slate-500">{doc.summary}</p>
      ) : null}

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <DocumentBody body={doc.body || ""} tokens={tokens} />
      </div>

      {doc.requires_signature ? (
        <SignBlock
          docKey={doc.doc_key}
          title={doc.title}
          alreadySigned={!!doc.signed}
          signedAt={doc.signed_at}
          signedName={doc.typed_name}
          suggestedName={user.name || ""}
          backHref="/tm/tech/documents"
        />
      ) : (
        <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-500">
          Nothing to sign on this page. It is here so you can read it whenever
          you want.
        </p>
      )}

      <DocumentEditor
        docKey={doc.doc_key}
        title={doc.title}
        summary={doc.summary}
        body={doc.body || ""}
        isTemplate={isOurs}
        requiresSignature={!!doc.requires_signature}
        canEdit={canEditDoc}
      />

    </div>
  );
}
