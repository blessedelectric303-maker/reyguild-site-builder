"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

// The step between "I have a login" and "I have a company".
//
// The question that matters is the second one. An administrator setting the
// company up on the owner's behalf gets full access to run it, but is recorded
// as an admin - which means they sign the whole employee booklet, and the
// owner keeps the seat that cannot be taken away from him.

export default function SetupPage() {
  const [companyName, setCompanyName] = useState("");
  const [yourName, setYourName] = useState("");
  const [phone, setPhone] = useState("");
  const [actingAs, setActingAs] = useState<"owner" | "admin" | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login?next=/setup";
        return;
      }
      const meta: any = user.user_metadata || {};
      setYourName((meta.full_name || meta.name || "").trim());

      // Already on a company? Nothing to do here.
      const { data: mem } = await supabase
        .schema("suite")
        .from("memberships")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      if (mem && (mem as any).company_id) {
        window.location.href = "/onboarding";
        return;
      }
      setChecking(false);
    })();
  }, []);

  async function submit() {
    setError(null);
    if (!actingAs) {
      setError("Tell us which one you are before we build the company.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/company/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, yourName, phone, actingAs }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "That did not work. Try again.");
        setBusy(false);
        return;
      }
      // Straight into the paperwork. Everybody signs something, even an owner.
      window.location.href = "/onboarding";
    } catch {
      setError("No connection. Nothing was created.");
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="text-sm text-slate-400">Checking your account...</p>
      </main>
    );
  }

  const choice = (
    key: "owner" | "admin",
    title: string,
    blurb: string
  ) => (
    <button
      type="button"
      onClick={() => {
        setActingAs(key);
        setError(null);
      }}
      className={
        "w-full rounded-xl border p-4 text-left " +
        (actingAs === key
          ? "border-amber-400 bg-slate-800"
          : "border-slate-700 bg-slate-900/60 hover:border-slate-600")
      }
    >
      <span className="block text-sm font-semibold text-white">{title}</span>
      <span className="mt-1 block text-xs leading-snug text-slate-400">{blurb}</span>
    </button>
  );

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/60 p-8">
        <div className="text-center mb-6">
          <div className="text-[10px] tracking-[0.3em] text-slate-400 mb-2">
            SERVICE COMPANY SOFTWARE
          </div>
          <div className="text-2xl font-extrabold tracking-wide">
            <span style={{ color: "#e0a82e" }}>REY</span>
            <span className="text-white">GUILD</span>
          </div>
        </div>

        <h1 className="text-lg font-semibold text-white">Set up your company</h1>
        <p className="mt-1 text-sm leading-snug text-slate-400">
          One screen, then the paperwork, then you are in.
        </p>

        <div className="mt-5 space-y-3">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Company name"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          />
          <input
            type="text"
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Company phone"
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <p className="mt-6 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Which one are you?
        </p>
        <div className="space-y-2">
          {choice(
            "owner",
            "I own this company",
            "You get everything, and you are the only person who signs nothing but the app's terms and the ReyGuild NDA."
          )}
          {choice(
            "admin",
            "I am an administrator, setting this up for the owner",
            "Full access to run the company, with the owner's permission. You sign the whole employee packet, same as a tech - an administrator sees everybody's records."
          )}
        </div>

        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

        <button
          type="button"
          onClick={submit}
          disabled={busy || companyName.trim().length < 2 || yourName.trim().length < 2}
          className="mt-5 w-full rounded-md py-2.5 text-sm font-semibold text-slate-900 disabled:opacity-50"
          style={{ background: "#e0a82e" }}
        >
          {busy ? "Building your company..." : "Create my company"}
        </button>

        <p className="mt-4 text-center text-[11px] leading-snug text-slate-500">
          Joining a company somebody already set up? Use the invite link they
          sent you instead of this page.
        </p>
      </div>
    </main>
  );
}
