// src/lib/supabase.ts
// Supabase client for REST API access (used on Vercel where port 5432 is blocked)
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

// Server-side: use service_role key (longer timeout, bypasses RLS)
// Client-side: use anon key
const supabaseKey =
    typeof window === "undefined"
        ? process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
        : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseKey);
