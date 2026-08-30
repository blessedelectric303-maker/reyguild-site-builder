import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DocumentList, { type DocRow } from "@/components/DocumentList";
import RequiredForms, { type FormRow } from "@/components/RequiredForms";
import Logo from "@/components/Logo";

export const dynamic = "force-dynamic";

// The wall between accepting an invite and getting into the app.
//
// It is deliberately NOT inside either app's layout: an owner has no T and M
// technician session, and a brand new apprentice has nothing at all yet, so
// this page has to stand on its own.

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding");

  let docs: DocRow[] = [];
  let forms: FormRow[] = [];
  let role = "";

  try {
    const { data: d } = await supabase.schema("suite").rpc("my_documents");
    docs = (d || []) as DocRow[];
    const { data: f } = await supabase.schema("suite").rpc("my_required_files");
    forms = (f || []) as FormRow[];
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    role = ((mem as any) || {}).role || "";
  } catch (e) {
    // Fall through. An empty list means nothing to do, which is the right
    // answer on a deployment where the documents have not been loaded yet.
  }

  const unsignedDocs = docs.filter((d) => d.requires_signature && !d.signed).length;
  const missingForms = forms.filter((f) => f.required && !f.uploaded).length;
  const done = unsignedDocs === 0 && missingForms === 0;

  const total = docs.filter((d) => d.requires_signature).length + forms.filter((f) => f.required).length;
  const finished = total - unsignedDocs - missingForms;
  const pct = total ? Math.round((finished / total) * 100) : 100;

  const home = role === "owner" || role === "admin" ? "/" : "/tm/enter";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Logo dark size={24} />
          <a href="/auth/signout" className="text-xs text-slate-400 underline">
            Sign out
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900">Before you start</h1>
        <p className="mt-1 text-sm leading-snug text-slate-600">
          There is paperwork to read, sign and hand in before your app is
          switched on. It takes about twenty minutes and you can stop and come
          back - everything saves as you go.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-slate-900">
              {finished} of {total} done
            </span>
            <span className="text-xs text-slate-500">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className={"h-full rounded-full " + (done ? "bg-emerald-600" : "bg-amber-500")}
              style={{ width: pct + "%" }}
            />
          </div>
        </div>

        {done ? (
          <a
            href={home}
            className="mt-4 block rounded-xl bg-emerald-700 py-4 text-center text-base font-bold text-white"
          >
            All done - take me into the app
          </a>
        ) : null}

        <DocumentList
          docs={docs}
          basePath="/onboarding"
          heading="1. The app's terms"
          blurb="What ReyGuild does with your information, including your location."
          filter={(d) => d.is_platform}
        />

        <DocumentList
          docs={docs}
          basePath="/onboarding"
          heading="2. Your company's agreements"
          blurb="Read each part and sign it. The last page cannot be signed until the rest are done."
          filter={(d) => !d.is_platform}
        />

        <RequiredForms rows={forms} />

        {done ? (
          <a
            href={home}
            className="mt-6 block rounded-xl bg-emerald-700 py-4 text-center text-base font-bold text-white"
          >
            All done - take me into the app
          </a>
        ) : (
          <p className="mt-6 rounded-xl bg-slate-100 p-4 text-center text-sm text-slate-500">
            The app opens as soon as the last item above is done.
          </p>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Stuck on something? Call the office on 720-607-6440.
        </p>
      </div>
    </main>
  );
}
