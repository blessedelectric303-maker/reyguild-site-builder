"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { roleLabel } from "@/utils/roles";
import { createSubmissionLock, inviteEmailMatches, inviteProblemMessage } from "@/lib/invite-flow";

// JOINING A COMPANY IS NOT SIGNING UP.
//
// The office has already said who this person is and what their email is, so
// this page asks for two things only: their name and a password. The email is
// shown but cannot be changed - change it and the invite would no longer be
// theirs. Signing up through the front door instead would have made them the
// owner of a brand new company, which is exactly what we are avoiding.

export default function Accept({ token }: { token: string }) {
  const submission = useRef(createSubmissionLock());
  const acceptance = useRef<{ key: string; promise: Promise<{ error: unknown }> } | null>(null);
  const [wrongAccount, setWrongAccount] = useState(false);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [problem, setProblem] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function acceptForUser(supabase: ReturnType<typeof createClient>, userId: string) {
    const key = token + ":" + userId;
    // React may replay the loading effect. Reuse acceptance so one page
    // cannot submit the same invite twice while the first call is in flight.
    if (acceptance.current?.key !== key) {
      acceptance.current = {
        key,
        promise: Promise.resolve(supabase.schema("suite").rpc("accept_invite", { invite_token: token })),
      };
    }
    return acceptance.current.promise;
  }

  useEffect(() => {
    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true);
    setProblem("");
    setMsg("");
    setWrongAccount(false);
    setInvite(null);
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (cancelled) return;
        if (authError && authError.name !== "AuthSessionMissingError") {
          setProblem("We couldn't check your sign-in. Please try again.");
          return;
        }
        const { data, error } = await supabase.schema("suite")
          .rpc("invite_preview", { p_token: token });
        if (cancelled) return;
        if (error) {
          setProblem(inviteProblemMessage(error, "preview"));
          return;
        }
        const row = Array.isArray(data) && data.length ? data[0] : null;
        if (!row || typeof row.email !== "string" || !row.email.trim()) {
          setProblem("This invite link is not valid. Ask the office to send another one.");
          return;
        }
        if (String(row.status || "").toLowerCase() !== "pending") {
          setProblem("This invite has already been used or was cancelled.");
          return;
        }
        setInvite(row);

        if (user) {
          // Only the verified recipient may accept; missing emails fail closed.
          if (!inviteEmailMatches(user.email, row.email)) {
            setWrongAccount(true);
            setProblem(
              "This invite is for " + row.email + ", but you are signed in as " +
              (user.email || "a different account") + ". Sign out first, then open the link again - or send " +
              "it to them to open on their own phone."
            );
            return;
          }
          const { error: accErr } = await acceptForUser(supabase, user.id);
          if (cancelled) return;
          if (accErr) {
            setProblem(inviteProblemMessage(accErr, "accept"));
            return;
          }
          setMsg("You're in. Taking you to your paperwork...");
          redirectTimer = setTimeout(() => { window.location.href = "/onboarding"; }, 900);
        }
      } catch {
        if (!cancelled) setProblem("We couldn't check this invite. Please check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [token]);

  async function createAccount() {
    if (loading || problem || msg || !invite || !submission.current.tryAcquire()) return;
    let navigating = false;
    let accountCreated = false;
    setError("");
    try {
      if (password.length < 8) {
        setError("Use at least 8 characters.");
        return;
      }
      if (fullName.trim().length < 2) {
        setError("Type your full name - it goes on everything you sign.");
        return;
      }
      setBusy(true);
      const supabase = createClient();
      const { data, error: signErr } = await supabase.auth.signUp({
        email: String(invite.email),
        password,
        options: {
          data: { full_name: fullName.trim() },
          emailRedirectTo: window.location.origin + "/auth/callback?next=" +
            encodeURIComponent("/join/" + encodeURIComponent(token)),
        },
      });
      if (signErr) {
        setError(
          signErr.message.toLowerCase().includes("already")
            ? "You already have a ReyGuild login for this address. Sign in and this page will finish the job."
            : signErr.message
        );
        return;
      }
      accountCreated = true;
      if (!data.session) {
        setMsg("Account created. Check your email to confirm it, then open this link again.");
        return;
      }
      if (!data.user || !inviteEmailMatches(data.user.email, invite.email)) {
        setProblem("Your login is ready, but we couldn't verify the invite's email address. Please sign in with the invited address to continue.");
        return;
      }
      const { error: accErr } = await acceptForUser(supabase, data.user.id);
      if (accErr) {
        setProblem("Your login is ready. " + inviteProblemMessage(accErr, "accept"));
        return;
      }
      window.location.href = "/onboarding";
      navigating = true;
    } catch {
      if (accountCreated) {
        setProblem("Your login is ready, but we couldn't finish joining your company. Please sign in to try again.");
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

  const joinPath = "/join/" + encodeURIComponent(token);
  const loginPath = "/login?next=" + encodeURIComponent(joinPath);

  const box =
    "w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2.5 text-base text-slate-100";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <img src="/logo/crest-chrome.png" alt="ReyGuild" className="mx-auto mb-6 h-auto w-20" />

        {loading ? (
          <p className="text-slate-300">Checking your invite...</p>
        ) : problem ? (
          <>
            <p role="alert" className="text-slate-200">{problem}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {wrongAccount && <a
                href={"/auth/signout?next=" + encodeURIComponent(joinPath)}
                className="inline-block rounded-md px-4 py-2 text-sm font-semibold text-slate-900"
                style={{ background: "#CC9000" }}
              >
                Sign out and use this invite
              </a>}
              <a
                href={loginPath}
                className="inline-block rounded-md border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-200"
              >
                Sign in
              </a>
              {!wrongAccount && <button type="button" onClick={() => window.location.reload()} className="rounded-md border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-200">Try again</button>}
            </div>
          </>
        ) : msg ? (
          <p className="text-slate-200">{msg}</p>
        ) : (
          <>
            <h1 className="text-xl font-bold text-white">
              {invite.company_name} has added you
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              as {roleLabel(String(invite.role || ""))}. Pick a password and you are in.
            </p>

            <div className="mt-6 space-y-3 text-left">
              <div>
                <label className="text-xs font-semibold text-slate-400">Your email</label>
                <input value={String(invite.email)} readOnly className={box + " opacity-70"} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Your full name</label>
                <input
                  disabled={busy}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="First and last name"
                  autoComplete="name"
                  className={box}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-400">Choose a password</label>
                <input
                  disabled={busy}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className={box}
                />
              </div>
            </div>

            {error ? <p role="alert" className="mt-3 text-sm text-red-400">{error}</p> : null}
            <p className="mt-3 text-center text-xs text-slate-400">Already have a login? <a href={loginPath} className="underline">Sign in</a></p>

            <button
              type="button"
              onClick={createAccount}
              disabled={busy}
              className="mt-5 w-full rounded-md py-3 text-sm font-bold text-slate-900 disabled:opacity-50"
              style={{ background: "#CC9000" }}
            >
              {busy ? "Setting up..." : "Create my password"}
            </button>

            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Next you will read and sign your paperwork. It is quick, and it
              saves as you go.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
