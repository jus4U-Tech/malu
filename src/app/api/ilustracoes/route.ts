import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET — Lista ilustrações (opcionalmente filtrar por autorId)
export async function GET(req: NextRequest) {
    try {
        const autorId = req.nextUrl.searchParams.get("autorId");
        const where = autorId ? { autorId } : {};

        const ilustracoes = await prisma.ilustracao.findMany({
            where,
            include: { autor: { select: { nome: true } } },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(ilustracoes);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// POST — Salva uma ilustração aprovada
export async function POST(req: NextRequest) {
    try {
        const { autorId, prompt, url, participantes, extras, estilo } = await req.json();

        if (!autorId || !prompt || !url) {
            return NextResponse.json({ error: "autorId, prompt e url são obrigatórios" }, { status: 400 });
        }

        const ilustracao = await prisma.ilustracao.create({
            data: {
                autorId,
                prompt,
                estilo: estilo || "",
                url,
                participantes: participantes || [],
                extras: extras || [],
            },
            include: { autor: { select: { nome: true } } },
        });

        return NextResponse.json(ilustracao);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
