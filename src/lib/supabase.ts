// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side (anon key — acesso seguro)
export const supabase = createClient(supabaseUrl, supabaseAnon);

// Server-side only (service role — nunca expor no frontend)
export function supabaseAdmin() {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Upload de foto para o Supabase Storage
export async function uploadFoto(
  buffer: Buffer,
  path: string,
  contentType = "image/jpeg"
): Promise<string> {
  const admin = supabaseAdmin();
  const { error } = await admin.storage
    .from("fotos")
    .upload(path, buffer, { contentType, upsert: true });
  if (error) throw error;
  const { data } = admin.storage.from("fotos").getPublicUrl(path);
  return data.publicUrl;
}
