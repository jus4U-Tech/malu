// src/app/api/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── GET /api/config ─────────────────────────────────────────────────────────
export async function GET() {
    try {
        let config = await prisma.config.findUnique({ where: { id: "singleton" } });
        if (!config) {
            config = await prisma.config.create({
                data: { id: "singleton", prdFotos: "", prdIlustracoes: "", appName: "Big Brother Malú", appUrl: "" },
            });
        }
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
        const config = await prisma.config.upsert({
            where: { id: "singleton" },
            create: {
                id: "singleton",
                prdFotos: body.prdFotos ?? "",
                prdIlustracoes: body.prdIlustracoes ?? "",
                appName: body.appName ?? "Big Brother Malú",
                appUrl: body.appUrl ?? "",
            },
            update: {
                prdFotos: body.prdFotos ?? "",
                prdIlustracoes: body.prdIlustracoes ?? "",
                appName: body.appName ?? "Big Brother Malú",
                appUrl: body.appUrl ?? "",
            },
        });
        return NextResponse.json(config);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao salvar config" }, { status: 500 });
    }
}
