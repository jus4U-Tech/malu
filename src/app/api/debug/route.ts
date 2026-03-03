// src/app/api/debug/route.ts — TEMPORARY debug route
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
    // Test the exact same query as sync route
    const partsRes = await supabase
        .from("participantes")
        .select("id, nome, palpite, fotos(id, ordem)")
        .order("nome")
        .limit(3);

    const plainRes = await supabase
        .from("participantes")
        .select("id, nome, palpite")
        .order("nome")
        .limit(3);

    return NextResponse.json({
        withJoin: {
            count: partsRes.data?.length ?? -1,
            error: partsRes.error?.message || null,
            data: partsRes.data,
        },
        plain: {
            count: plainRes.data?.length ?? -1,
            error: plainRes.error?.message || null,
            data: plainRes.data,
        },
    });
}
