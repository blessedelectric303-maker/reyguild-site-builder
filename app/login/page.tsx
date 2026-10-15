"use client";

import { useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  createSubmissionLock, hasVerifiedMembership, inviteProblemMessage,
  readInviteLookup, safeNextPath, signInDestination,
} from "@/lib/invite-flow";

type Mode = "signin" | "signup" | "reset";

export default function LoginPage() {
  const supabase = createClient();

  const submission = useRef(createSubmissionLock());

  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function changeMode(nextMode: Mode) {
    if (submission.current.isLocked()) return;
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  async function handleSubmit() {
    if (!submission.current.tryAcquire()) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    let navigating = false;
    let accountCreated = false;
    function navigate(path: string) {
      window.location.href = path;
      navigating = true;
    }

    try {
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      const base = window.location.origin;
      const address = email.trim();

      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(address, {
          redirectTo: base + "/auth/callback?next=" + encodeURIComponent("/reset-password"),
        });
        if (error) {
          setError(error.message);
          return;
        }
        setNotice("If that email has an account, a reset link is on its way. Check your inbox.");
        return;
      }

      if (mode === "signup") {
        // Only an explicit, successful no-invite result permits owner signup.
        // A paused lookup must never separate an invitee into a new company.
        const invite = await readInviteLookup(() => supabase
          .schema("suite").rpc("invite_for_email", { p_email: address }));
        if (invite.kind === "unavailable") {
          setError(inviteProblemMessage(invite.error, "lookup"));
          return;
        }
        if (invite.kind === "pending") {
          navigate("/join/" + encodeURIComponent(invite.token));
          return;
        }
        if (!agreed) {
          setError("Tick the box to agree to the terms before creating an account.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: address,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: base + "/auth/callback?next=" + encodeURIComponent(next),
          },
        });
        if (error) {
          setError(error.message);
          return;
        }
        accountCreated = true;
        if (data.session) {
          // Establish the owner's company before opening the command centre.
          // Document signatures still happen by hand during onboarding.
          const response = await fetch("/api/start-company", { method: "POST" });
          const company = await response.json();
          if (!response.ok || company.ok !== true || !company.company_id) {
            setError("Your login is ready, but we couldn't finish setting up your company. Please sign in to try again.");
            setMode("signin");
            return;
          }
          navigate("/");
        } else {
          setNotice("Account created. Check your email to confirm it, then you'll be signed in.");
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: address, password });
      if (error || !data.user) {
        setError(error?.message || "We couldn't verify your sign-in. Please try again.");
        return;
      }
      const invite = await readInviteLookup(() => supabase
        .schema("suite").rpc("invite_for_email", { p_email: data.user.email || address }));
      let verifiedMember = false;
      if (invite.kind === "unavailable") {
        // Existing members may sign in during an invite-service pause, but an
        // unknown membership must not reach a page that creates a company.
        const membership = await supabase.schema("suite").from("memberships")
          .select("user_id,company_id").eq("user_id", data.user.id).limit(1).maybeSingle();
        verifiedMember = hasVerifiedMembership(membership.data, membership.error, data.user.id);
      }
      const destination = signInDestination(invite, next, verifiedMember);
      if (!destination) {
        setError(inviteProblemMessage(invite.kind === "unavailable" ? invite.error : null, "lookup"));
        return;
      }
      navigate(destination);
    } catch {
      if (accountCreated) {
        setMode("signin");
        setError("Your login is ready, but we couldn't finish setting up your company. Please sign in to try again.");
      } else {
        setError("We couldn't finish that request. Please check your connection and try again.");
      }
    } finally {
      if (!navigating) {
        submission.current.release();
        setBusy(false);
      }
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
          <div className="rg-wordmark text-2xl tracking-wide"><span className="gold-shine">REY</span><span className="text-white">GUILD</span></div>
        </div>

        <div className="flex rounded-lg bg-slate-800 p-1 mb-6 text-sm">
          <button type="button" disabled={busy} onClick={() => changeMode("signin")} className={tabCls(mode === "signin")}>Sign in</button>
          <button type="button" disabled={busy} onClick={() => changeMode("signup")} className={tabCls(mode === "signup")}>Sign up</button>
        </div>

        {mode === "reset" ? (
          <p className="text-sm text-slate-400 mb-4">Enter your email and we will send you a link to set a new password.</p>
        ) : null}

        <div className="space-y-3">
          {mode === "signup" && (
            <input disabled={busy} type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none" />
          )}
          <input disabled={busy} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none" />
          {mode !== "reset" && (
            <input disabled={busy} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none" />
          )}

          {mode === "signup" && (
            <label className="flex items-start gap-2 pt-1 text-xs leading-snug text-slate-400">
              <input
                disabled={busy}
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

          {mode === "signin" && (
            <p className="text-xs text-slate-500">
              We keep you signed in on this device, so you only do this once.
            </p>
          )}

          <button type="button" onClick={handleSubmit} disabled={busy || (mode === "signup" && !agreed)} className="w-full rounded-md py-2 text-sm font-semibold text-slate-900 disabled:opacity-60" style={{ background: "#CC9000" }}>{buttonLabel}</button>

          {mode === "signin" ? (
            <button type="button" disabled={busy} onClick={() => changeMode("reset")} className="w-full text-center text-xs text-slate-400 hover:text-slate-200">Forgot password?</button>
          ) : null}
          {mode === "reset" ? (
            <button type="button" disabled={busy} onClick={() => changeMode("signin")} className="w-full text-center text-xs text-slate-400 hover:text-slate-200">Back to sign in</button>
          ) : null}

          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          {notice && <p role="status" className="text-sm text-emerald-400">{notice}</p>}
        </div>
      </div>
    </main>
  );
}
