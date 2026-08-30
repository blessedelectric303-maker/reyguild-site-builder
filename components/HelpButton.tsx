"use client";
import Link from "next/link";

// This used to point at /help, which does not exist and never has - pressing
// Help gave a 404 from both headers.
//
// The target is passed in, because the two shells want different things. The
// tech gets his own help screen. An ADMIN already has everything on the
// command center, so his Help goes back there rather than into the tech's
// screens - he should never land in the tech view by accident.
export default function HelpButton({ className, href }: { className?: string; href?: string }) {
  return (
    <Link
      href={href || "/"}
      className={className || "text-xs text-slate-400 hover:text-white underline"}
    >
      Help
    </Link>
  );
}
