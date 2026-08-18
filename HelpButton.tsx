"use client";
import Link from "next/link";
export default function HelpButton({ className }: { className?: string }) {
  return (
    <Link
      href="/help"
      className={className || "text-xs text-slate-400 hover:text-white underline"}
    >
      Help
    </Link>
  );
}
