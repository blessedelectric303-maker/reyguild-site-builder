"use client";

import { useMemo, useState } from "react";
import type { SopSection } from "@/lib/sop";

export default function HelpSearch({ sections }: { sections: SopSection[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return [];
    const words = q.split(/\s+/).filter(Boolean);
    return sections
      .map((s) => {
        const haystack = (
          s.title +
          " " +
          s.keywords.join(" ") +
          " " +
          s.body
        ).toLowerCase();
        // score: how many of the typed words appear anywhere in the section
        const score = words.reduce(
          (n, w) => (haystack.includes(w) ? n + 1 : n),
          0
        );
        return { section: s, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [q, sections]);

  function jumpTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-gold-500");
      setTimeout(() => el.classList.remove("ring-2", "ring-gold-500"), 1600);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the handbook — try a few words like 'request materials'"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
        />
        {q && (
          <p className="text-xs text-slate-500 mt-1">
            {matches.length === 0
              ? "No matches — try different words, or email support@reyguild.com."
              : matches.length + (matches.length === 1 ? " result" : " results")}
          </p>
        )}
      </div>

      {q && matches.length > 0 && (
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden">
          {matches.map((m) => (
            <button
              key={m.section.id}
              type="button"
              onClick={() => jumpTo(m.section.id)}
              className="w-full text-left px-4 py-3 hover:bg-slate-50"
            >
              <div className="text-sm font-medium text-slate-900">
                {m.section.title}
              </div>
              <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                {m.section.body.split("\n")[0]}
              </div>
            </button>
          ))}
        </div>
      )}

      {!q && (
        <p className="text-xs text-slate-500">
          Type a few words above to jump to the right section, or scroll to
          browse the full handbook below.
        </p>
      )}
    </div>
  );
}
