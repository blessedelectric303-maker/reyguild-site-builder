import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-8">
      <div className="text-xs tracking-[0.3em] text-slate-400 mb-6">
        SERVICE COMPANY SOFTWARE
      </div>
      <h1 className="text-5xl font-extrabold tracking-wide">
        <span style={{ color: "#e0a82e" }}>REY</span>
        <span className="text-white">GUILD</span>
      </h1>

      {user ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-slate-300">
            Signed in as <span className="text-white">{user.email}</span>
          </p>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-slate-300 max-w-md">
            One login. Every ReyGuild app in one place.
          </p>
          <Link
            href="/login"
            className="mt-2 rounded-md px-5 py-2 text-sm font-semibold text-slate-900"
            style={{ background: "#e0a82e" }}
          >
            Sign in
          </Link>
        </div>
      )}

      <div className="mt-10 h-[3px] w-16 rounded bg-[#e0a82e]" />
    </main>
  );
}
