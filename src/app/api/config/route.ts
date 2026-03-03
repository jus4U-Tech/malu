// src/app/api/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// ── GET /api/config ─────────────────────────────────────────────────────────
export async function GET() {
    try {
        const { data: config, error } = await supabase
            .from("config")
            .select("*")
            .eq("id", "singleton")
            .single();

        if (error && error.code === "PGRST116") {
            // Não existe — criar
            const { data: created } = await supabase
                .from("config")
                .insert({ id: "singleton", prdFotos: "", prdIlustracoes: "", appName: "Big Brother Malú", appUrl: "" })
                .select()
                .single();
            return NextResponse.json(created);
        }

        if (error) throw error;
        return NextResponse.json(config);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao buscar config" }, { status: 500 });
    }
}

// ── PUT /api/config ─────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();

        const { data: config, error } = await supabase
            .from("config")
            .upsert({
                id: "singleton",
                prdFotos: body.prdFotos ?? "",
                prdIlustracoes: body.prdIlustracoes ?? "",
                appName: body.appName ?? "Big Brother Malú",
                appUrl: body.appUrl ?? "",
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(config);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao salvar config" }, { status: 500 });
    }
}
