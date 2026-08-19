import type { ReactNode } from "react";

// The shared shell every app room inherits. The apps carry their own sidebar
// now, so this stays out of the way and just holds the page.
export default async function AppsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950">
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
