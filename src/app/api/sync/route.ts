// src/app/api/sync/route.ts
// Rota que retorna todos os dados de uma vez para carregar o app
// Usa Supabase REST API (funciona no Vercel) com fallback para Prisma (dev local)
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
    try {
        const [partsRes, extrasRes, configRes] = await Promise.all([
            supabase
                .from("participantes")
                .select("id, nome, palpite, fotos(id, url, ordem)")
                .order("nome"),
            supabase
                .from("elementos_extras")
                .select("id, nome, descricao, foto")
                .order("createdAt"),
            supabase
                .from("config")
                .select("*")
                .eq("id", "singleton")
                .single(),
        ]);

        if (partsRes.error) throw partsRes.error;
        if (extrasRes.error) throw extrasRes.error;

        // Normalizar participantes para o formato que o front-end espera
        const parts = (partsRes.data || []).map((p) => ({
            id: p.id,
            nome: p.nome,
            palpite: p.palpite || "",
            fotos: (p.fotos || [])
                .sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem)
                .map((f: { url: string }) => f.url),
        }));

        const cfg = configRes.data || {
            prdFotos: "",
            prdIlustracoes: "",
            appName: "Big Brother Malú",
            appUrl: "",
        };

        return NextResponse.json({
            parts,
            extras: (extrasRes.data || []).map((e) => ({
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
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Erro ao sincronizar" },
            { status: 500 }
        );
    }
}
