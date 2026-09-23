import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import DocumentList, { type DocRow } from "@/components/DocumentList";
import RequiredForms, { type FormRow } from "@/components/RequiredForms";
import DocumentPreviewList, { type PreviewRow } from "@/components/DocumentPreviewList";
import Logo from "@/components/Logo";
import { paperworkState } from "@/lib/signingGate";

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
  let preview: PreviewRow[] = [];
  let forms: FormRow[] = [];
  let role = "";

  try {
    const { data: d } = await supabase.schema("suite").rpc("my_documents");
    docs = (d || []) as DocRow[];
    const { data: f } = await supabase.schema("suite").rpc("my_required_files");
    forms = (f || []) as FormRow[];
    // Everything this company has, whether or not this person has to sign it.
    // An owner signs the four ReyGuild documents only, but should still be
    // able to read the policies their own people are being asked to sign.
    try {
      const { data: p } = await supabase.schema("suite").rpc("documents_for_preview");
      preview = (p || []) as PreviewRow[];
    } catch (e) {
      preview = [];
    }
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

  // READ THE ROLE ON ITS OWN, NOT AT THE END OF SOMEBODY ELSE'S TRY BLOCK.
  // It used to be the last line of the block above, so if ANY call before it
  // failed - a document list, a preview - the whole thing jumped to the catch
  // and the role stayed empty. Empty is not owner, so an owner pressing "let
  // me get to work" was quietly sent to the phone app instead of his own
  // command centre, and nothing said why.
  try {
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    role = ((mem as any) || {}).role || "";
  } catch (e) {
    role = "";
  }

  const home = role === "owner" || role === "admin" ? "/" : "/tm/enter";

  // THE SAME ANSWER THE FRONT DOOR USES, ASKED ONCE.
  //
  // This page must never offer a way out that the front door will refuse -
  // that is a loop, and it is exactly what happened when this page counted the
  // days itself. So the door out of here opens on the gate's own verdict and
  // nothing else.
  //
  // The four ReyGuild documents are a hard stop with no "not now" beside them.
  // The company booklet is a countdown, and past the countdown it is a stop
  // too - for everybody except the owner, who wrote those documents and gets
  // told rather than blocked.
  const paperwork = await paperworkState();
  const daysLeft = paperwork.daysLeft;
  const walled = paperwork.locked;
  const mustSignFour = paperwork.platformOutstanding > 0;

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
          <strong>The four app documents have to be signed to open your app.</strong>{" "}
          Your company&rsquo;s own agreements underneath them can wait - you get
          7 days for those. You can stop and come back at any point; everything
          saves as you go.
        </p>
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
          <p>
            <strong>The four ReyGuild documents</strong> below are the agreement
            between you and ReyGuild: what the app may do with your information,
            what we keep private, and the rules for using it. Everybody who uses
            the app signs these, owners included. They are what protects your
            company&rsquo;s information and ours.
          </p>
          <p className="mt-2">
            <strong>Everything under &ldquo;Your company&rsquo;s agreements&rdquo;
            belongs to you.</strong> Those carry your company name, and your
            people sign them when you invite them - the conduct policy, safety,
            drug and alcohol, non-solicit and the rest. You can read every one
            of them here, and they stay in the app under Settings so you can
            hand them out, update them or print them whenever you need.
          </p>
          <p className="mt-2 text-slate-500">
            Questions about any of this? Email{" "}
            <a href="mailto:support@reyguild.com" className="font-semibold underline">
              support@reyguild.com
            </a>
            .
          </p>
        </div>

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
        ) : mustSignFour ? (
          /* THE FOUR REYGUILD DOCUMENTS. NO WAY ROUND THESE.
             There is deliberately no button here. These four are the agreement
             between this person and the software itself - the terms, the
             privacy policy, the cookie policy and the NDA - and the app does
             not open until they are signed, for an apprentice or for the owner.
             It is four signatures, once, for as long as they use ReyGuild. */
          <div className="mt-4 rounded-xl border-2 border-slate-800 bg-slate-900 p-4 text-center">
            <p className="text-sm font-bold text-amber-300">
              Sign the four app documents to open your app.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              They are the first section below, and they take a minute.
              Everybody signs these once, owners included, and never again.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Your company&rsquo;s own agreements underneath them can wait - you
              get 7 days for those, and they live in{" "}
              <strong className="text-slate-300">Settings &rarr; Company Documents</strong>{" "}
              from now on.
            </p>
          </div>
        ) : !walled ? (
          /* GET TO WORK NOW, SIGN IT TONIGHT.
             A man handed a phone at 7am on a job site should not be standing
             in a driveway reading a drug and alcohol policy while a customer
             waits. He has a week, and the app reminds him every time he opens
             it. This is the door out - it is not a way of avoiding the
             paperwork, it is a way of doing it at the right time of day. */
          <div className="mt-4 rounded-xl border border-slate-300 bg-white p-4">
            <a
              href={home}
              className="block rounded-lg bg-slate-900 py-3.5 text-center text-base font-bold text-white"
            >
              Not now - let me get to work
            </a>
            <p className="mt-2 text-center text-xs text-slate-500">
              {daysLeft <= 0
                ? "This is past due. The app will keep asking every time you open it until it is done."
                : daysLeft === 1
                  ? "Today is your last day. Finish this before tomorrow or the app will stop here."
                  : "You have " + daysLeft + " days to finish this. After that the app stops here until it is done."}
            </p>
            <p className="mt-2 border-t border-slate-200 pt-2 text-center text-xs text-slate-500">
              You will not have to hunt for it. It is in{" "}
              <strong className="text-slate-700">Settings &rarr; Company Documents</strong>,
              and the app reminds you at the top of every screen until it is
              done.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-center">
            <p className="text-sm font-bold text-red-800">Your week is up.</p>
            <p className="mt-1 text-xs text-red-700">
              Finish the paperwork below and the app opens straight back up.
            </p>
          </div>
        )}

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

        <DocumentPreviewList rows={preview} signable={docs} />

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
