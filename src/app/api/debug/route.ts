// src/app/api/debug/route.ts — TEMPORARY
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(url, key);

    // Sem limit — mesmo que sync
    const partsRes = await supabase
        .from("participantes")
        .select("id, nome, palpite, fotos(id, ordem)")
        .order("nome");

    return NextResponse.json({
        url: url.substring(0, 30),
        keyLen: key.length,
        count: partsRes.data?.length ?? -1,
        error: partsRes.error?.message || null,
        status: partsRes.status,
        statusText: partsRes.statusText,
        first: partsRes.data?.[0] || null,
    });
}
