import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import DocumentList, { type DocRow } from "@/components/DocumentList";
import RequiredForms, { type FormRow } from "@/components/RequiredForms";

export const dynamic = "force-dynamic";

// Everything a person has signed, or still has to sign, in one place, for
// ever. Ben's rule: it lives in Settings under Company Documents all the time,
// every time - not just during the first week.

export default async function TechDocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let docs: DocRow[] = [];
  let forms: FormRow[] = [];
  let reachable = true;

  try {
    const supabase = await createClient();
    const { data: d, error } = await supabase.schema("suite").rpc("my_documents");
    if (error) reachable = false;
    docs = (d || []) as DocRow[];
    const { data: f } = await supabase.schema("suite").rpc("my_required_files");
    forms = (f || []) as FormRow[];
  } catch (e) {
    reachable = false;
  }

  const outstanding = docs.filter((d) => d.requires_signature && !d.signed).length;

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Company Documents</h1>
      <p className="mt-1 text-sm text-slate-500">
        Everything you have agreed to, and everything you still need to. Each
        one opens on its own and stays here for as long as you work here.
      </p>

      {!reachable ? (
        <p className="mt-4 rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-600">
          These have not been loaded yet. Nothing is broken - your office needs
          to add them. Everything else in the app still works.
        </p>
      ) : null}

      {outstanding > 0 ? (
        <div className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 p-4">
          <div className="text-sm font-bold text-red-800">
            {outstanding} document{outstanding === 1 ? "" : "s"} still to sign
          </div>
          <p className="mt-1 text-xs leading-snug text-red-700">
            Read each one and sign at the bottom. The last page cannot be signed
            until the rest are done.
          </p>
        </div>
      ) : docs.length ? (
        <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          All signed. Nothing outstanding.
        </div>
      ) : null}

      <DocumentList
        docs={docs}
        basePath="/tm/tech/documents"
        heading="Company agreements"
        blurb="Conduct, safety, and what you agreed to when you were hired."
        filter={(d) => !d.is_platform}
      />

      <RequiredForms rows={forms} />

      <DocumentList
        docs={docs}
        basePath="/tm/tech/documents"
        heading="ReyGuild app policies"
        blurb="How this app handles your data, including where and when it records your location."
        filter={(d) => d.is_platform}
      />

      <Link
        href="/tm/tech/settings"
        className="mt-8 block text-center text-sm text-slate-500 underline"
      >
        Back to Settings
      </Link>
    </div>
  );
}
