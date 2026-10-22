import Link from "next/link";

// Where the bridge sends you when it cannot sign you in. Kept separate so the
// bridge itself stays a route handler and is allowed to write the cookie.

const MESSAGES: Record<string, { title: string; body: string }> = {
  membership: {
    title: "Finish joining your company",
    body: "Open your company invitation or ask the owner to confirm your membership before opening Time and Material.",
  },
  unverified: {
    title: "Confirm your email first",
    body: "Use the confirmation link in your email, then sign in again to open your company's workspace.",
  },
  inactive: {
    title: "Your account is inactive",
    body: "Ask your company owner or administrator to reactivate your Time and Material access.",
  },
  noemail: {
    title: "No email on this account",
    body: "Time and Material matches people by email address, and this account does not have one.",
  },
  db: {
    title: "Could not reach Time and Material",
    body: "The job database did not answer. Try again in a moment.",
  },
  session: {
    title: "Could not start your session",
    body: "You were found, but the session could not be created. Try again in a moment.",
  },
  nolink: {
    title: "Your company is not linked yet",
    body: "Your company does not have a Time and Material workspace linked yet. Ask the owner or administrator to finish company setup.",
  },
  nouser: {
    title: "No Time and Material account yet",
    body: "Nobody in Time and Material is using this email address. An owner or admin needs to add this person under Users first, using the same email.",
  },
};

export default async function NoAccess({ searchParams }: { searchParams: Promise<{ reason?: string; detail?: string }> }) {
  const { reason, detail } = await searchParams;
  const msg = MESSAGES[reason || ""] || MESSAGES.db;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <h1 className="text-2xl text-white">{msg.title}</h1>
      <p className="mt-3 max-w-md text-sm text-slate-400">{msg.body}</p>
      {detail ? <p className="mt-2 text-xs text-slate-500">{detail}</p> : null}
      <Link href="/" className="mt-6 rounded-md px-5 py-2 text-sm font-semibold text-slate-900" style={{ background: "#CC9000" }}>Back to the command center</Link>
    </main>
  );
}

