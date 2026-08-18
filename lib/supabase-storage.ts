import { createClient } from "@supabase/supabase-js";

// Built lazily. Creating the client at import time crashes the whole build
// when the env vars are not present yet (e.g. a first deploy).
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (_supabase) return _supabase;
  const supabaseUrl = process.env.SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  _supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return _supabase;
}

export async function uploadPhoto(
  bucket: string,
  path: string,
  fileBuffer: Buffer,
  contentType: string
) {
  const { data, error } = await getSupabase().storage
    .from(bucket)
    .upload(path, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error("Supabase upload error:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, path: data.path };
}

export async function getPhotoSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await getSupabase().storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) {
    console.error("Supabase signed URL error:", error);
    return null;
  }

  return data.signedUrl;
}

export async function deletePhoto(bucket: string, path: string) {
  const { error } = await getSupabase().storage.from(bucket).remove([path]);
  if (error) {
    console.error("Supabase delete error:", error);
    return false;
  }
  return true;
}