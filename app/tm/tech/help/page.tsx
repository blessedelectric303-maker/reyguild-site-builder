import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TECH_GUIDE, TECH_QUESTIONS } from "@/utils/techHelp";
import { SUPPORT } from "@/utils/sops";

export const dynamic = "force-dynamic";

export default async function TechHelpPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Help</h1>
      <p className="mt-1 text-sm text-slate-500">
        How the app works, the questions that come up most, and how to reach
        somebody if neither of those sorted it.
      </p>

      <div className="mt-5 space-y-5">
        {TECH_GUIDE.map((sec) => (
          <div key={sec.heading} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">{sec.heading}</div>
            <ul className="mt-2.5 space-y-2">
              {sec.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-slate-300" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-7">
        <h2 className="text-base font-semibold text-slate-900">Common questions</h2>
        <p className="mt-1 text-xs text-slate-500">Tap one to open the answer.</p>
        <div className="mt-3 space-y-2">
          {TECH_QUESTIONS.map((qa) => (
            <details key={qa.q} className="rounded-xl border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer text-sm font-medium text-slate-900">{qa.q}</summary>
              <p className="mt-2 text-sm text-slate-600">{qa.a}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="mt-7 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-base font-semibold text-slate-900">Still stuck?</h2>
        <p className="mt-2 text-sm text-slate-600">
          Anything about a job, your hours or your schedule goes to your own
          office first - they can actually change those. If the app itself is
          misbehaving, contact ReyGuild.
        </p>
        <a href={"mailto:" + SUPPORT.email} className="mt-3 block rounded-md px-3 py-2.5 text-center text-sm font-bold text-slate-900" style={{ background: "#CC9000" }}>
          Email ReyGuild
        </a>
        {SUPPORT.phone ? (
          <a href={"tel:" + SUPPORT.phone} className="mt-2 block rounded-md border border-slate-300 px-3 py-2.5 text-center text-sm text-slate-700">
            Call ReyGuild
          </a>
        ) : null}
        <p className="mt-3 text-xs text-slate-500">
          Say which screen you were on and what you expected to happen. It saves a round trip.
        </p>
      </div>
    </div>
  );
}
