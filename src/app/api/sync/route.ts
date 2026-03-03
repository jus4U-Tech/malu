// src/app/api/sync/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Queries sequenciais (debug: Promise.all pode causar timeout parcial)
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

        // Debug log
        console.log("SYNC partsRes:", partsRes.data?.length, "err:", partsRes.error?.message);
        console.log("SYNC extrasRes:", extrasRes.data?.length, "err:", extrasRes.error?.message);

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
                _debug: { partsCount: partsRes.data?.length, extrasCount: extrasRes.data?.length },
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
