import { createClient } from "@/utils/supabase/server";

// HAS THIS PERSON SIGNED EVERYTHING THEY HAVE TO SIGN?
//
// The handbook, the safety rules and the platform terms are not optional, so
// the app asks this at every front door and sends anyone with paperwork
// outstanding to /onboarding first. It answers "no paperwork" whenever the
// question cannot be answered - a company that has not loaded any documents,
// or a database hiccup, must not lock people out of their own app.

export async function hasUnsignedDocuments(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.schema("suite").rpc("my_documents");
    if (error) return false;
    const docs = (data as any[]) || [];
    return docs.some((d) => d && d.requires_signature && !d.signed);
  } catch (e) {
    return false;
  }
}
