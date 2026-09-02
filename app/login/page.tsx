"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Mode = "signin" | "signup" | "reset";

export default function LoginPage() {
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function nextPath(): string {
    if (typeof window === "undefined") return "/";
    const raw = new URLSearchParams(window.location.search).get("next") || "/";
    return raw.startsWith("/") ? raw : "/";
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const next = nextPath();
    const base = window.location.origin;

    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: base + "/auth/callback?next=" + encodeURIComponent("/reset-password"),
      });
      setBusy(false);
      if (error) {
        setError(error.message);
        return;
      }
      setNotice("If that email has an account, a reset link is on its way. Check your inbox.");
      return;
    }

    if (mode === "signup") {
      if (!agreed) {
        setError("Tick the box to agree to the terms before creating an account.");
        setBusy(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: base + "/auth/callback?next=" + encodeURIComponent(next),
        },
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      if (data.session) {
        // Record the acceptance as three separate signatures - terms, privacy
        // and cookies - rather than one "agreed to everything" row, which is
        // worth very little later. Best effort: if it fails, the onboarding
        // page asks again rather than the sign up dying here.
        try {
          await fetch("/api/documents/accept-platform", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: fullName }),
          });
        } catch {}
        window.location.href = next;
      } else {
        setNotice("Account created. Check your email to confirm it, then you'll be signed in.");
        setBusy(false);
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
    } else {
      window.location.href = next;
    }
  }

  const tabCls = (active: boolean) =>
    "flex-1 rounded-md py-1.5 " + (active ? "bg-slate-700 text-white" : "text-slate-400");

  const buttonLabel = busy
    ? "Please wait..."
    : mode === "signup"
    ? "Create account"
    : mode === "reset"
    ? "Send reset link"
    : "Sign in";

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900/60 p-8">
        <div className="text-center mb-6">
          <div className="text-[10px] tracking-[0.3em] text-slate-400 mb-2">SERVICE COMPANY SOFTWARE</div>
          <div className="text-2xl font-extrabold tracking-wide"><span className="gold-shine">REY</span><span className="text-white">GUILD</span></div>
        </div>

        <div className="flex rounded-lg bg-slate-800 p-1 mb-6 text-sm">
          <button type="button" onClick={() => setMode("signin")} className={tabCls(mode === "signin")}>Sign in</button>
          <button type="button" onClick={() => setMode("signup")} className={tabCls(mode === "signup")}>Sign up</button>
        </div>

        {mode === "reset" ? (
          <p className="text-sm text-slate-400 mb-4">Enter your email and we will send you a link to set a new password.</p>
        ) : null}

        <div className="space-y-3">
          {mode === "signup" && (
            <input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none" />
          )}
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none" />
          {mode !== "reset" && (
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none" />
          )}

          {mode === "signup" && (
            <label className="flex items-start gap-2 pt-1 text-xs leading-snug text-slate-400">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-none accent-amber-500"
              />
              <span>
                I agree to the{" "}
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="text-slate-200 underline">Terms of Service</a>,{" "}
                <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-200 underline">Privacy Policy</a>{" and "}
                <a href="/legal/cookies" target="_blank" rel="noopener noreferrer" className="text-slate-200 underline">Cookie Policy</a>.
                Ticking this box and creating an account is my electronic signature on all three.
              </span>
            </label>
          )}

          <button type="button" onClick={handleSubmit} disabled={busy || (mode === "signup" && !agreed)} className="w-full rounded-md py-2 text-sm font-semibold text-slate-900 disabled:opacity-60" style={{ background: "#CC9000" }}>{buttonLabel}</button>

          {mode === "signin" ? (
            <button type="button" onClick={() => { setMode("reset"); setError(null); setNotice(null); }} className="w-full text-center text-xs text-slate-400 hover:text-slate-200">Forgot password?</button>
          ) : null}
          {mode === "reset" ? (
            <button type="button" onClick={() => { setMode("signin"); setError(null); setNotice(null); }} className="w-full text-center text-xs text-slate-400 hover:text-slate-200">Back to sign in</button>
          ) : null}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {notice && <p className="text-sm text-emerald-400">{notice}</p>}
        </div>
      </div>
    </main>
  );
}
