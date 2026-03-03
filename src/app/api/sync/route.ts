// src/app/api/sync/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const url = process.env.PROD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const key = process.env.PROD_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        const supabase = createClient(url, key);

        // Queries separadas — evita join PostgREST que carrega colunas base64
        const [partsRes, fotosRes, extrasRes, configRes] = await Promise.all([
            supabase.from("participantes").select("id, nome, palpite").order("nome"),
            supabase.from("fotos").select("id, participanteId, ordem").order("ordem"),
            supabase.from("elementos_extras").select("id, nome, descricao").order("createdAt"),
            supabase.from("config").select("*").eq("id", "singleton").single(),
        ]);

        if (partsRes.error) throw partsRes.error;
        if (fotosRes.error) throw fotosRes.error;
        if (extrasRes.error) throw extrasRes.error;

        // Agrupar fotos por participante (com thumb)
        const fotosByPart = new Map<string, { foto: string; thumb: string }[]>();
        for (const f of fotosRes.data || []) {
            const arr = fotosByPart.get(f.participanteId) || [];
            arr.push({
                foto: `/api/foto/${f.id}`,
                thumb: `/api/foto/${f.id}/thumb`,
            });
            fotosByPart.set(f.participanteId, arr);
        }

        const parts = (partsRes.data || []).map((p: any) => ({
            id: p.id,
            nome: p.nome,
            palpite: p.palpite || "",
            fotos: (fotosByPart.get(p.id) || []).map(f => f.foto),
            thumbs: (fotosByPart.get(p.id) || []).map(f => f.thumb),
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
                    foto: `/api/foto-extra/${e.id}`,
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
        console.error("SYNC ERROR:", JSON.stringify(error, null, 2));
        const detail = error instanceof Error ? error.message : JSON.stringify(error);
        return NextResponse.json(
            { error: "Erro ao sincronizar", detail },
            { status: 500 }
        );
    }
}
