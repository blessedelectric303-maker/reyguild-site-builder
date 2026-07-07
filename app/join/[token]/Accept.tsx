"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function Accept({ token }: { token: string }) {
  const [msg, setMsg] = useState("Checking your invite...");
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setNeedLogin(true);
        setMsg("Create your account or sign in to join the team. We'll bring you right back here.");
        return;
      }
      const { error } = await supabase.schema("suite").rpc("accept_invite", { invite_token: token });
      if (error) {
        setMsg("This invite couldn't be used: " + error.message);
        return;
      }
      setMsg("You're in! Taking you to your workspace...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    })();
  }, [token]);

  const loginHref = "/login?next=/join/" + token;

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <img src="/crest.png" alt="ReyGuild" className="w-20 h-auto mx-auto mb-6" />
        <p className="text-slate-200">{msg}</p>
        {needLogin && (
          <a href={loginHref} className="inline-block mt-6 rounded-md px-4 py-2 text-sm font-semibold text-slate-900" style={{ background: "#e0a82e" }}>Sign in or create account</a>
        )}
      </div>
    </main>
  );
}
