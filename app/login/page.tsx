"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    setNotice(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) setError(error.message);
      else setNotice("Account created. Check your email to confirm it, then sign in.");
      setBusy(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setBusy(false);
      } else {
        window.location.href = "/";
      }
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900/60 p-8">
        <div className="text-center mb-6">
          <div className="text-[10px] tracking-[0.3em] text-slate-400 mb-2">
            SERVICE COMPANY SOFTWARE
          </div>
          <div className="text-2xl font-extrabold tracking-wide">
            <span style={{ color: "#e0a82e" }}>REY</span>
            <span className="text-white">GUILD</span>
          </div>
        </div>

        <div className="flex rounded-lg bg-slate-800 p-1 mb-6 text-sm">
          <button
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-md py-1.5 ${
              mode === "signin" ? "bg-slate-700 text-white" : "text-slate-400"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md py-1.5 ${
              mode === "signup" ? "bg-slate-700 text-white" : "text-slate-400"
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
          />

          <button
            onClick={handleSubmit}
            disabled={busy}
            className="w-full rounded-md py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
            style={{ background: "#e0a82e" }}
          >
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {notice && <p className="text-sm text-emerald-400">{notice}</p>}
        </div>
      </div>
    </main>
  );
}
