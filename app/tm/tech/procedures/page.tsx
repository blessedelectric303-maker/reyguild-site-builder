import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TECH_CARDS, skinFor } from "@/utils/techProcedures";

export const dynamic = "force-dynamic";

export default async function TechProceduresPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Procedures</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your truck cards. Each one has a one page summary and a checklist you
        can tick as you go - it saves itself, so you can close it and come back.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {TECH_CARDS.map((c) => {
          const skin = skinFor(c);
          return (
            <Link
              key={c.key}
              href={"/tm/tech/procedures/" + c.key}
              className={"flex min-h-[92px] flex-col justify-between rounded-xl p-3 shadow-sm hover:brightness-110" + (c.key === "tech_clockin" ? " col-span-2" : "")}
              style={{ background: skin.bg, color: skin.text }}
            >
              <span className="text-sm font-extrabold uppercase tracking-wide">{c.label}</span>
              <span className="text-[11px] leading-snug opacity-90">{c.blurb}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
