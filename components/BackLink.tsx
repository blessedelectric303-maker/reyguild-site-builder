"use client";

import { useRouter } from "next/navigation";

// GO BACK TO WHERE YOU WERE.
//
// Every one of these used to be a hardcoded "Command center" link. Open the
// export page from inside Settings, press it, and you land on the command
// centre - not back in Settings where you came from. The label was telling
// the truth and the behaviour was still wrong.
//
// This uses the browser's own history, which knows the answer. The href is a
// fallback for the case history cannot help: somebody opened the page from a
// bookmark, or a link in an email, and there is no previous screen to return
// to. Without that fallback the button would do nothing at all, which is
// worse than going somewhere sensible.

export default function BackLink({
  fallback = "/",
  label = "Back",
  className,
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();

  function go() {
    // A fresh tab has one entry in history - this page. Nothing to go back to.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallback);
  }

  return (
    <button
      type="button"
      onClick={go}
      className={className || "text-sm text-slate-400 underline hover:text-slate-200"}
    >
      &larr; {label}
    </button>
  );
}
