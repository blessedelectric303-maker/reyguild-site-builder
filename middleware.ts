import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

// THE ONE FRONT DOOR.
// Every Vercel build also answers on its own long random address, and those
// addresses are frozen: they keep serving the code from the day they were
// built. Opening one from an old tab or an old email looks like the app but
// behaves like a version from weeks ago - wrong data, dead address lookups,
// and half a day lost to bugs that were fixed long ago. So anything that
// arrives on a *.vercel.app address is sent to the real one, carrying the
// page and anything after the question mark with it.
const HOME = (process.env.NEXT_PUBLIC_APP_URL || "https://tm.serviceopspro.com").replace(/\/+$/, "");

// EXCEPT THE SCHEDULED JOBS.
//
// Vercel calls its own cron URLs on the deployment's *.vercel.app address,
// never on the custom domain - so the redirect above caught every one of
// them and answered 307. A browser follows a redirect; a cron runner does
// not. The nightly backup and every customer follow-up email silently
// stopped the day that rule went in, and nothing anywhere said so: the job
// was listed, enabled, and returning a perfectly healthy 307.
//
// These paths are machine-to-machine, they are guarded by CRON_SECRET, and
// there is no stale-preview problem to solve for something with no screen.
function isMachineCall(pathname: string): boolean {
  return pathname.startsWith("/api/cron/");
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  if (host.endsWith(".vercel.app") && !isMachineCall(request.nextUrl.pathname)) {
    const to = new URL(request.nextUrl.pathname + request.nextUrl.search, HOME);
    // 307, not a permanent redirect: a browser remembers a permanent one for
    // good, and that is a hard thing to undo if the real address ever moves.
    return NextResponse.redirect(to, 307);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
