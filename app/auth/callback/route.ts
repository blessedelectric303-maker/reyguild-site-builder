import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { safePath } from "@/lib/safe-path";
import { clearSessionCookie } from "@/lib/auth";

// Handles links from Supabase auth emails (password reset, and email
// confirmation if turned on). Exchanges the one-time code for a session,
// then sends the person on to wherever they were headed.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safePath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const login = new URL("/login", request.url);
      login.searchParams.set("auth_error", "This sign-in link has expired or was already used. Please sign in or request a new link.");
      return NextResponse.redirect(login);
    }
    await clearSessionCookie();
  }

  return NextResponse.redirect(new URL(next, request.url));
}

