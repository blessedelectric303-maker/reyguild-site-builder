import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// WHO YOU CAN MESSAGE - one answer, from one place.
//
// Proposals & Invoicing used to build its own contact list from a hand-kept
// "people" array inside the app. That meant the messaging rule existed twice
// and could drift: somebody deleted from the roster still had a thread, and a
// real employee who had never been typed into that array had none.
//
// suite.messageable_members() is the rule. The office tier reaches everybody;
// a supervisor, tech or apprentice reaches only the office, never each other.
// The contact list IS the rule - if a person is not in this response, there is
// no way for the sender to reach them.

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ contacts: [], role: "" });

  try {
    // Scoped to this user. An unscoped membership read hands back any member
    // of the company, which is the bug that once gave a tech the owner's row.
    const { data: mem } = await supabase
      .schema("suite")
      .from("memberships")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    const { data, error } = await supabase.schema("suite").rpc("messageable_members");
    if (error) return NextResponse.json({ contacts: [], role: "" });

    const contacts = (data || []).map((c: any) => ({
      user_id: c.user_id,
      role: c.role,
      email: c.email,
      // A name to show. The email local part is a poor label but it is better
      // than a blank, and it is the only name the suite schema holds today.
      label: String(c.email || "").split("@")[0],
    }));

    return NextResponse.json({
      contacts,
      role: ((mem as any) || {}).role || "",
    });
  } catch {
    // Not deployed yet. An empty list means the app keeps its old behaviour
    // rather than showing an error on a screen nobody was looking at.
    return NextResponse.json({ contacts: [], role: "" });
  }
}
