// src/app/api/debug/route.ts — TEMPORARY debug route
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "(missing)";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "(missing)";
    const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "(missing)";

    const { data, error, count } = await supabase
        .from("participantes")
        .select("id, nome", { count: "exact", head: true });

    return NextResponse.json({
        envCheck: {
            url: url.substring(0, 30) + "...",
            anonKeyPresent: anonKey !== "(missing)",
            anonKeyLen: anonKey.length,
            svcKeyPresent: svcKey !== "(missing)",
            svcKeyLen: svcKey.length,
            svcKeyStart: svcKey.substring(0, 20) + "...",
        },
        queryResult: { count, error: error?.message || null },
    });
}
