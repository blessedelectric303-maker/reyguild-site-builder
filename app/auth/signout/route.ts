import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";

// SIGN OUT MUST CLEAR BOTH SESSIONS.
//
// This used to end the Supabase session and nothing else. But the T&M side
// does not use Supabase - it has its own cookie, blessed_track_session - and
// that cookie survived a sign out.
//
// So on a shared browser: the first person signs out, the next person signs
// in as a completely different company, opens T&M, and is handed the FIRST
// person's identity and their company's jobs and hours. A cross-tenant leak,
// caused by one session being forgotten and the other not.
//
// Anything that ends a session ends every session.

const TM_SESSION = "blessed_track_session";

async function signOutEverything() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Even if Supabase fails, still clear the other cookie below.
  }
  try {
    const store = await cookies();
    store.delete(TM_SESSION);
  } catch {
    // Nothing more we can do; the redirect still happens.
  }
}

export async function POST(request: Request) {
  await signOutEverything();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}

// Some places link to sign out rather than posting to it. A GET that does not
// sign out is worse than no link at all - the person believes they are out.
export async function GET(request: Request) {
  await signOutEverything();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
