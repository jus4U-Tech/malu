// src/app/api/sync/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Client criado inline para garantir que env vars estão carregadas
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        const supabase = createClient(url, key);

        const partsRes = await supabase
            .from("participantes")
            .select("id, nome, palpite, fotos(id, ordem)")
            .order("nome");

        const extrasRes = await supabase
            .from("elementos_extras")
            .select("id, nome, descricao, foto")
            .order("createdAt");

        const configRes = await supabase
            .from("config")
            .select("*")
            .eq("id", "singleton")
            .single();

        if (partsRes.error) throw partsRes.error;
        if (extrasRes.error) throw extrasRes.error;

        const parts = (partsRes.data || []).map((p: any) => ({
            id: p.id,
            nome: p.nome,
            palpite: p.palpite || "",
            fotos: (p.fotos || [])
                .sort((a: any, b: any) => a.ordem - b.ordem)
                .map((f: any) => `/api/foto/${f.id}`),
        }));

        const cfg = configRes.data || {
            prdFotos: "",
            prdIlustracoes: "",
            appName: "Big Brother Malú",
            appUrl: "",
        };

        return NextResponse.json(
            {
                parts,
                extras: (extrasRes.data || []).map((e: any) => ({
                    id: e.id,
                    nome: e.nome,
                    descricao: e.descricao || "",
                    foto: e.foto || "",
                })),
                cfg: {
                    prdFotos: cfg.prdFotos || "",
                    prdIlustracoes: cfg.prdIlustracoes || "",
                    appName: cfg.appName || "Big Brother Malú",
                    appUrl: cfg.appUrl || "",
                },
            },
            {
                headers: {
                    "Cache-Control": "no-store, no-cache, must-revalidate",
                },
            }
        );
    } catch (error) {
        console.error("SYNC ERROR:", error);
        return NextResponse.json(
            { error: "Erro ao sincronizar", detail: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
