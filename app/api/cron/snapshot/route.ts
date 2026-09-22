import { NextRequest, NextResponse } from "next/server";
import { runSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// The snapshot as a URL, kept so it can be fired by hand when somebody wants
// a copy right now rather than waiting for tonight. The work itself lives in
// lib/snapshot.ts, because on this plan only ONE cron job runs and the daily
// follow-up job calls it too - see the comment at the top of that file.

export async function GET(req: NextRequest) {
  // REFUSE TO RUN UNGUARDED. This used to skip the check entirely when
  // CRON_SECRET was missing, so one typo in an environment variable turned a
  // job that touches every company on the platform into a public URL anybody
  // could fire. Unconfigured is a failure, not permission.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 500 });
  }
  const auth = req.headers.get("authorization") || "";
  if (auth !== "Bearer " + secret) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const r = await runSnapshot();
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
