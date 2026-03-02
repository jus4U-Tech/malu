// src/app/api/participantes/[id]/fotos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── POST /api/participantes/:id/fotos ──────────────────────────────────────
// Adiciona uma foto ao participante
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { url, original = true } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL da foto é obrigatória" }, { status: 400 });
        }

        // Verificar se participante existe
        const part = await prisma.participante.findUnique({ where: { id: params.id } });
        if (!part) {
            return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
        }

        // Contar fotos para definir ordem
        const count = await prisma.foto.count({ where: { participanteId: params.id } });

        const foto = await prisma.foto.create({
            data: {
                participanteId: params.id,
                url,
                original,
                ordem: count,
            },
        });

        return NextResponse.json(foto, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao salvar foto" }, { status: 500 });
    }
}

// ── DELETE /api/participantes/:id/fotos ─────────────────────────────────────
// Remove uma foto por índice (ordem)
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { searchParams } = new URL(req.url);
        const idx = parseInt(searchParams.get("idx") || "-1", 10);

        if (idx < 0) {
            return NextResponse.json({ error: "Índice inválido" }, { status: 400 });
        }

        // Buscar fotos ordenadas
        const fotos = await prisma.foto.findMany({
            where: { participanteId: params.id },
            orderBy: { ordem: "asc" },
        });

        if (idx >= fotos.length) {
            return NextResponse.json({ error: "Índice fora do range" }, { status: 404 });
        }

        await prisma.foto.delete({ where: { id: fotos[idx].id } });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao remover foto" }, { status: 500 });
    }
}
