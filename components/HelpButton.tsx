"use client";
import Link from "next/link";

// This used to point at /help, which does not exist and never has - pressing
// Help gave a 404 from both the tech header and the admin header. The target
// is now passed in so each shell links to its own help screen.
export default function HelpButton({ className, href }: { className?: string; href?: string }) {
  return (
    <Link
      href={href || "/tm/tech/help"}
      className={className || "text-xs text-slate-400 hover:text-white underline"}
    >
      Help
    </Link>
  );
}
