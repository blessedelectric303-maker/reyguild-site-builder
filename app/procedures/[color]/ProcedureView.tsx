"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CALL_COLORS, CALL_ORDER, type CallKey } from "@/utils/callColors";
import SupplyHouses from "@/app/components/SupplyHouses";

type Item = {
  id: string;
  label: string;
  group_heading: string | null;
  field_key: string | null;
  input_type: string;
  choices: string[] | null;
  required_to_dispatch: boolean;
  required_to_close: boolean;
};
type Section = {
  id: string;
  heading: string;
  body: string | null;
  collapsed_by_default: boolean;
  color_tag?: string | null;
};
type Proc = {
  id: string;
  color: string;
  title: string;
  purpose: string | null;
  qualifies: string | null;
  opening_script: string | null;
  may_say: string | null;
  may_not_say: string | null;
  one_pager: string | null;
  schedules_to_calendar?: boolean;
};

// A small coloured tag saying which call type a section belongs to.
function ColorTag({ tag }: { tag: string }) {
  const c = (CALL_COLORS as Record<string, { label: string; bg: string; text: string }>)[tag];
  if (!c) return null;
  return (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide" style={{ background: c.bg, color: c.text }}>{c.label}</span>
  );
}

export default function ProcedureView({
  procedure, sections, items, skin, companyId, userId, unfilled, settings, canEdit,
}: {
  procedure: Proc;
  sections: Section[];
  items: Item[];
  unfilled?: boolean;
  skin: { bg: string; text: string };
  companyId: string;
  userId: string;
  settings?: Record<string, any> | null;
  canEdit?: boolean;
}) {
  const router = useRouter();
  const [pane, setPane] = useState<"none" | "checklist" | "onepage">("none");
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [runId, setRunId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<any>(null);

  // Reference shelves rather than procedures. Long, searchable, and every
  // card is something somebody wants to paste into an email.
  const libraryMode = procedure.color === "replies" || procedure.color === "sops";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [copied, setCopied] = useState<string | null>(null);

  // Pick up an unfinished checklist for this color so closing the tab
  // never loses work. These run for hours by design.
  useEffect(() => {
    if (libraryMode) return;
    (async () => {
      try {
        const res = await fetch("/api/checklist?color=" + procedure.color);
        const data = await res.json();
        if (data.run) {
          setRunId(data.run.id);
          setAnswers(data.run.answers || {});
        }
      } catch (e) {
        // starting fresh is fine
      }
    })();
  }, [procedure.color, libraryMode]);

  const persist = useCallback(async (next: Record<string, any>) => {
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, color: procedure.color, procedureId: procedure.id, answers: next }),
      });
      const data = await res.json();
      if (data.id && !runId) setRunId(data.id);
      setSaved("Saved");
      setTimeout(() => setSaved(""), 1500);
    } catch (e) {
      setSaved("Not saved - check your connection");
    }
  }, [runId, procedure.color, procedure.id]);

  function update(key: string, value: any) {
    const next = { ...answers, [key]: value };
    setAnswers(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(next), 600);
  }

  async function copySection(s: Section) {
    const text = s.body ? s.heading + "\n\n" + s.body : s.heading;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(s.id);
      setTimeout(() => setCopied(null), 1500);
    } catch (e) {
      setErr("This browser would not let us reach the clipboard. Select the text and copy it by hand.");
    }
  }

  // Office-only procedures (material, absence, question) must never offer to
  // create work. PURPLE's own spec is explicit: it links, it never creates a
  // job. The flag lives on the procedure so a company can change its mind
  // without a code change.
  const schedulable = procedure.schedules_to_calendar !== false;

  // Where a procedure cannot create work, the top right corner is free. The
  // answering kit uses it to send you back to pick the colour, which is the
  // whole point of the kit. Everything else gets a plain way home.
  const backLabel =
    procedure.color === "answering" ? "Back out to call type" : "Back to command center";

  const blockers = items.filter(
    (i) => i.required_to_dispatch && i.field_key && !answers[i.field_key]
  );

  // Which colours actually appear in this shelf - no empty filter chips.
  const presentTags = useMemo(() => {
    const set = new Set<string>();
    sections.forEach((s) => {
      if (s.color_tag) set.add(s.color_tag);
    });
    return CALL_ORDER.filter((k) => set.has(k));
  }, [sections]);

  const hasUntagged = useMemo(
    () => sections.some((s) => !s.color_tag),
    [sections]
  );

  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sections.filter((s) => {
      if (filter === "untagged" && s.color_tag) return false;
      if (filter !== "all" && filter !== "untagged" && s.color_tag !== filter) return false;
      if (!q) return true;
      return (
        s.heading.toLowerCase().includes(q) ||
        (s.body || "").toLowerCase().includes(q)
      );
    });
  }, [sections, query, filter]);

  const searching = query.trim().length > 0 || filter !== "all";

  async function estimateToSchedule() {
    if (busy) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId, color: procedure.color, procedureId: procedure.id,
          answers, handoff: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Could not carry this forward.");
        setBusy(false);
        return;
      }
      router.push("/apps/estimating?call=" + encodeURIComponent(data.callId || ""));
    } catch (e) {
      setErr("Could not reach the server.");
      setBusy(false);
    }
  }

  const grouped: { heading: string; rows: Item[] }[] = [];
  items.forEach((i) => {
    const h = i.group_heading || "Checklist";
    const last = grouped[grouped.length - 1];
    if (last && last.heading === h) last.rows.push(i);
    else grouped.push({ heading: h, rows: [i] });
  });

  const chipBase = "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide";

  return (
    <main className="min-h-screen pb-16">
      {/* The actions stay put. Reachable from anywhere in the procedure. */}
      <div className="sticky top-0 z-40 shadow-lg" style={{ background: skin.bg }}>
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-2 px-4 py-3">
          <div className="flex gap-2">
            {procedure.one_pager ? (
              <button type="button" onClick={() => setPane(pane === "onepage" ? "none" : "onepage")} className="rounded-md bg-black/25 px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ color: skin.text }}>One page</button>
            ) : null}
            {items.length ? (
              <button type="button" onClick={() => setPane(pane === "checklist" ? "none" : "checklist")} className="rounded-md bg-black/25 px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ color: skin.text }}>Checklist</button>
            ) : null}
          </div>
          <div className="mx-auto px-2 text-center text-sm font-extrabold uppercase tracking-widest" style={{ color: skin.text }}>{procedure.title}</div>
          {schedulable ? (
            <button type="button" onClick={estimateToSchedule} disabled={busy} className="ml-auto rounded-md bg-black/25 px-3 py-2 text-xs font-bold uppercase tracking-wide disabled:opacity-60" style={{ color: skin.text }}>{busy ? "Working..." : "Schedule"}</button>
          ) : (
            <button type="button" onClick={() => router.push("/")} className="ml-auto rounded-md bg-black/25 px-3 py-2 text-xs font-bold uppercase tracking-wide" style={{ color: skin.text }}>{backLabel}</button>
          )}
        </div>
        {schedulable && blockers.length ? (
          <div className="bg-black/30 px-4 py-1.5 text-center text-[11px]" style={{ color: skin.text }}>Still needed before dispatch: {blockers.map((b) => b.label).join(", ")}</div>
        ) : null}
      </div>

      {unfilled ? (
        <p className="mx-auto mt-4 max-w-4xl rounded-md border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">Some details in square brackets are not filled in yet. Add them under Settings and they will fill in everywhere at once.</p>
      ) : null}
      {err ? <p className="mx-auto mt-4 max-w-4xl rounded-md bg-red-950 px-3 py-2 text-sm text-red-300">{err}</p> : null}

      <div className="mx-auto max-w-4xl px-4 py-6">
        {pane === "onepage" ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg text-white">One page</h2>
              <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-600 px-3 py-1.5 text-xs text-slate-300">Print</button>
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-slate-200">{procedure.one_pager || "The one page card has not been written yet."}</pre>
          </div>
        ) : null}

        {pane === "checklist" ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg text-white">Checklist</h2>
              <span className="text-xs text-emerald-400">{saved}</span>
            </div>
            <p className="mb-4 text-xs text-slate-500">Saves as you go. Close it and come back whenever you like.</p>
            {grouped.length === 0 ? (
              <p className="text-sm text-slate-500">No checklist items yet.</p>
            ) : grouped.map((g) => (
              <div key={g.heading} className="mb-5">
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">{g.heading}</div>
                <div className="space-y-2">
                  {g.rows.map((i) => {
                    const k = i.field_key || i.id;
                    const v = answers[k];
                    return (
                      <div key={i.id} className="rounded-lg border border-slate-800 p-3">
                        <label className="mb-1 block text-sm text-slate-200">
                          {i.label}
                          {i.required_to_dispatch ? <span className="ml-2 text-[10px] uppercase text-amber-400">before dispatch</span> : null}
                          {i.required_to_close ? <span className="ml-2 text-[10px] uppercase text-slate-500">before closing</span> : null}
                        </label>
                        {i.input_type === "check" ? (
                          <button type="button" onClick={() => update(k, !v)} className={"rounded-md px-3 py-1.5 text-xs font-semibold " + (v ? "bg-emerald-500 text-slate-900" : "border border-slate-600 text-slate-300")}>{v ? "Done" : "Mark done"}</button>
                        ) : i.input_type === "choice" && i.choices ? (
                          <div className="flex flex-wrap gap-2">
                            {i.choices.map((c) => (
                              <button type="button" key={c} onClick={() => update(k, c)} className={"rounded-full px-3 py-1 text-xs " + (v === c ? "bg-amber-500 text-slate-900 font-semibold" : "border border-slate-600 text-slate-300")}>{c}</button>
                            ))}
                          </div>
                        ) : (
                          <input value={v || ""} onChange={(e) => update(k, e.target.value)} inputMode={i.input_type === "money" || i.input_type === "number" ? "decimal" : undefined} className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {pane === "none" ? (
          <div className="space-y-4">
            {procedure.purpose ? <p className="text-sm text-slate-300">{procedure.purpose}</p> : null}
            {procedure.opening_script ? (
              <div className="rounded-xl border-l-4 p-4" style={{ borderColor: skin.bg, background: "rgba(255,255,255,0.04)" }}>
                <div className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Opening script</div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-100">{procedure.opening_script}</pre>
              </div>
            ) : null}
            {procedure.may_not_say ? (
              <div className="rounded-xl border border-red-900 bg-red-950/40 p-4">
                <div className="mb-1 text-xs font-bold uppercase tracking-widest text-red-300">Never</div>
                <pre className="whitespace-pre-wrap font-sans text-sm text-red-100">{procedure.may_not_say}</pre>
              </div>
            ) : null}

            {procedure.color === "material" ? (
              <SupplyHouses companyId={companyId} settings={settings || null} canEdit={canEdit === true} />
            ) : null}

            {libraryMode && sections.length ? (
              <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-3">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search these..." className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100" />
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => setFilter("all")} className={chipBase + (filter === "all" ? " bg-white text-slate-900" : " border border-slate-600 text-slate-300")}>All ({sections.length})</button>
                  {presentTags.map((k) => {
                    const c = CALL_COLORS[k as CallKey];
                    const on = filter === k;
                    return (
                      <button type="button" key={k} onClick={() => setFilter(on ? "all" : k)} className={chipBase + (on ? "" : " opacity-60")} style={{ background: c.bg, color: c.text }}>{c.label}</button>
                    );
                  })}
                  {hasUntagged ? (
                    <button type="button" onClick={() => setFilter(filter === "untagged" ? "all" : "untagged")} className={chipBase + (filter === "untagged" ? " bg-white text-slate-900" : " border border-slate-600 text-slate-300")}>Every call</button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {libraryMode && searching ? (
              <p className="text-xs text-slate-500">{visibleSections.length} of {sections.length} shown</p>
            ) : null}

            {visibleSections.map((s) => (
              <details key={s.id + (searching ? "-open" : "")} open={searching || !s.collapsed_by_default} className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-white">
                  <span className="mr-2">{s.heading}</span>
                  {s.color_tag ? <ColorTag tag={s.color_tag} /> : null}
                </summary>
                <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-slate-300">{s.body}</pre>
                {libraryMode ? (
                  <button type="button" onClick={() => copySection(s)} className="mt-3 rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800">{copied === s.id ? "Copied" : "Copy"}</button>
                ) : null}
              </details>
            ))}

            {libraryMode && sections.length > 0 && visibleSections.length === 0 ? (
              <p className="rounded-lg border border-slate-800 p-6 text-center text-sm text-slate-500">Nothing matches that. Clear the search or pick a different colour.</p>
            ) : null}

            {sections.length === 0 && !procedure.opening_script ? (
              <p className="rounded-lg border border-slate-800 p-6 text-center text-sm text-slate-500">The wording for this procedure has not been added yet. The checklist and the links above still work.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
