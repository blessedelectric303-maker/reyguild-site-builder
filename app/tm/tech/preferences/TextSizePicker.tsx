"use client";

import { useEffect, useState } from "react";

// Text size is the one preference that genuinely matters on a phone in a
// crawl space with gloves on. It is kept on the device rather than in the
// database - it is about the screen in your hand, not about you.
export const SIZES: { key: string; label: string; scale: string }[] = [
  { key: "normal", label: "Normal", scale: "100%" },
  { key: "large", label: "Large", scale: "112%" },
  { key: "xlarge", label: "Extra large", scale: "125%" },
];

export function applySize(key: string) {
  const s = SIZES.find((x) => x.key === key) || SIZES[0];
  document.documentElement.style.fontSize = s.scale;
}

export default function TextSizePicker() {
  const [sel, setSel] = useState("normal");

  useEffect(() => {
    let saved = "normal";
    try {
      saved = localStorage.getItem("reyguild-tech-textsize") || "normal";
    } catch (e) {
      // private browsing - the default is fine
    }
    setSel(saved);
    applySize(saved);
  }, []);

  function pick(key: string) {
    setSel(key);
    applySize(key);
    try {
      localStorage.setItem("reyguild-tech-textsize", key);
    } catch (e) {
      // nothing to do - it will just not stick between sessions
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {SIZES.map((s) => (
        <button
          type="button"
          key={s.key}
          onClick={() => pick(s.key)}
          className={
            "rounded-lg border px-3 py-3 text-sm font-semibold " +
            (sel === s.key
              ? "border-emerald-500 bg-emerald-50 text-emerald-800"
              : "border-slate-300 bg-white text-slate-700")
          }
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
