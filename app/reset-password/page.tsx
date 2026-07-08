"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900/60 p-8">
        <div className="text-center mb-6">
          <img src="/crest.png" alt="ReyGuild" className="w-16 h-auto mx-auto mb-3" />
          <div className="text-lg font-bold text-white">Set a new password</div>
        </div>

        {done ? (
          <p className="text-sm text-emerald-400 text-center">Password updated. Signing you in...</p>
        ) : (
          <div className="space-y-3">
            <input type="password" placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none" />
            <input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none" />
            <button type="button" onClick={submit} disabled={busy} className="w-full rounded-md py-2 text-sm font-semibold text-slate-900 disabled:opacity-60" style={{ background: "#e0a82e" }}>{busy ? "Saving..." : "Save new password"}</button>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </main>
  );
}
