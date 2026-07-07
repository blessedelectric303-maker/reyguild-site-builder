import Link from "next/link";
import type { ReactNode } from "react";

// The shared shell every app room inherits. Built once here so every app
// (now and future) gets the same branded top bar automatically.
export default function AppsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
        >
          <span aria-hidden>←</span> Back to command center
        </Link>
        <div className="flex items-center gap-2">
          <img src="/crest.png" alt="" className="w-6 h-auto" />
          <span className="text-sm font-extrabold tracking-wide">
            <span style={{ color: "#e0a82e" }}>REY</span>
            <span className="text-white">GUILD</span>
          </span>
        </div>
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
