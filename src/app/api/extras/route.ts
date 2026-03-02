// src/app/api/extras/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── GET /api/extras ─────────────────────────────────────────────────────────
export async function GET() {
    try {
        const extras = await prisma.elementoExtra.findMany({
            orderBy: { createdAt: "asc" },
        });
        return NextResponse.json(extras);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao buscar extras" }, { status: 500 });
    }
}

// ── POST /api/extras ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { nome, descricao, foto } = body;

        if (!nome?.trim()) {
            return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
        }

        const extra = await prisma.elementoExtra.create({
            data: {
                nome: nome.trim(),
                descricao: descricao || "",
                foto: foto || null,
            },
        });

        return NextResponse.json(extra, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao criar elemento" }, { status: 500 });
    }
}
