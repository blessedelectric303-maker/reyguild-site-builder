"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { roleLabel } from "@/utils/roles";

// JOINING A COMPANY IS NOT SIGNING UP.
//
// The office has already said who this person is and what their email is, so
// this page asks for two things only: their name and a password. The email is
// shown but cannot be changed - change it and the invite would no longer be
// theirs. Signing up through the front door instead would have made them the
// owner of a brand new company, which is exactly what we are avoiding.

export default function Accept({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [problem, setProblem] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      // Already signed in? Then this is just an acceptance.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .schema("suite")
        .rpc("invite_preview", { p_token: token });
      const row = Array.isArray(data) && data.length ? data[0] : null;

      if (error || !row) {
        setProblem("This invite link is not valid. Ask the office to send another one.");
        setLoading(false);
        return;
      }
      if (String(row.status || "").toLowerCase() !== "pending") {
        setProblem("This invite has already been used or was cancelled.");
        setLoading(false);
        return;
      }
      setInvite(row);

      if (user) {
        // AN INVITE BELONGS TO THE ADDRESS IT WAS SENT TO.
        //
        // This used to accept the moment it saw anybody signed in - so an
        // owner opening his own tech's invite link, in his own browser, to
        // check that it worked, was joined to his own company AS THAT TECH.
        // His membership was overwritten, he lost the command centre, the
        // real tech never got in, and nothing anywhere said what had
        // happened. Nobody accepts an invite addressed to somebody else.
        const signedInAs = String(user.email || "").trim().toLowerCase();
        const invitedIs = String(row.email || "").trim().toLowerCase();
        if (signedInAs && invitedIs && signedInAs !== invitedIs) {
          setProblem(
            "This invite is for " + row.email + ", but you are signed in as " +
            user.email + ". Sign out first, then open the link again - or send " +
            "it to them to open on their own phone."
          );
          setLoading(false);
          return;
        }

        const { error: accErr } = await supabase
          .schema("suite")
          .rpc("accept_invite", { invite_token: token });
        if (accErr) {
          setProblem("This invite could not be used: " + accErr.message);
          setLoading(false);
          return;
        }
        setMsg("You're in. Taking you to your paperwork...");
        setTimeout(() => {
          window.location.href = "/onboarding";
        }, 900);
        return;
      }
      setLoading(false);
    })();
  }, [token]);

  async function createAccount() {
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (fullName.trim().length < 2) {
      setError("Type your full name - it goes on everything you sign.");
      return;
    }
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { data, error: signErr } = await supabase.auth.signUp({
      email: String(invite.email),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (signErr) {
      // Most likely: they already have a login. Send them to sign in and come
      // straight back here, where the invite is accepted automatically.
      setBusy(false);
      setError(
        signErr.message.toLowerCase().includes("already")
          ? "You already have a ReyGuild login for this address. Sign in and this page will finish the job."
          : signErr.message
      );
      return;
    }
    if (!data.session) {
      setBusy(false);
      setMsg("Account created. Check your email to confirm it, then open this link again.");
      return;
    }
    const { error: accErr } = await supabase
      .schema("suite")
      .rpc("accept_invite", { invite_token: token });
    if (accErr) {
      setBusy(false);
      setError("Your account was created, but joining the company failed: " + accErr.message);
      return;
    }
    // Straight to the paperwork. The gate would send them here anyway.
    window.location.href = "/onboarding";
  }

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
            <p className="text-slate-200">{problem}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {/* Signed in as the wrong person is the common case now, so the
                  way OUT is the first button, not the way further in. */}
              <a
                href={"/auth/signout?next=/join/" + token}
                className="inline-block rounded-md px-4 py-2 text-sm font-semibold text-slate-900"
                style={{ background: "#CC9000" }}
              >
                Sign out and use this invite
              </a>
              <a
                href={"/login?next=/join/" + token}
                className="inline-block rounded-md border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-200"
              >
                Sign in
              </a>
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  className={box}
                />
              </div>
            </div>

            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

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
