import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/utils/supabase/server";
import Messages from "@/app/components/Messages";

export const dynamic = "force-dynamic";

export default async function TechMessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Messaging lives on the ReyGuild side. A tech who came in through
  // /tm/enter is carrying that session already; one who signed in some other
  // way is not, and gets told plainly rather than shown an empty box.
  let uid = "";
  let companyId = "";
  try {
    const supabase = await createClient();
    const {
      data: { user: su },
    } = await supabase.auth.getUser();
    uid = su?.id || "";
    if (uid) {
      const { data: mem } = await supabase
        .schema("suite")
        .from("memberships")
        .select("company_id")
        .limit(1)
        .maybeSingle();
      companyId = ((mem as any) || {}).company_id || "";
    }
  } catch (e) {
    uid = "";
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Messages</h1>
      <p className="mt-1 text-sm text-slate-500">
        Message the office. Anything about a job, your hours or your schedule
        belongs here - they can actually change those.
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
        {uid && companyId ? (
          <Messages userId={uid} companyId={companyId} triggerClassName="flex h-full min-h-[52px] w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50" />
        ) : (
          <p className="text-sm text-slate-600">
            Messages is not available on this login yet. Sign in through your
            company&apos;s ReyGuild address and it will appear here. Until then,
            phone the office - do not let something about a job wait.
          </p>
        )}
      </div>
    </div>
  );
}
