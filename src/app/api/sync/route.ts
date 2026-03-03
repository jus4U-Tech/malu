// src/app/api/sync/route.ts
// Rota que retorna todos os dados de uma vez para carregar o app
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const [participantes, extras, config] = await Promise.all([
            prisma.participante.findMany({
                include: { fotos: { orderBy: { ordem: "asc" } } },
                orderBy: { nome: "asc" },
            }),
            prisma.elementoExtra.findMany({ orderBy: { createdAt: "asc" } }),
            prisma.config.findUnique({ where: { id: "singleton" } }),
        ]);

        // Normalizar participantes para o formato que o front-end espera
        const parts = participantes.map((p) => ({
            id: p.id,
            nome: p.nome,
            palpite: p.palpite || "",
            fotos: p.fotos.map((f) => f.url),
        }));

        const cfg = config || { prdFotos: "", prdIlustracoes: "", appName: "Big Brother Malú", appUrl: "" };

        return NextResponse.json({
            parts,
            extras: extras.map((e) => ({
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
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: "Erro ao sincronizar", detail: msg }, { status: 500 });
    }
}
