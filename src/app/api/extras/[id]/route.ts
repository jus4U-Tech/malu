// src/app/api/extras/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── PATCH /api/extras/:id ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();
        const current = await prisma.elementoExtra.findUnique({ where: { id: params.id } });
        if (!current) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

        const updated = await prisma.elementoExtra.update({
            where: { id: params.id },
            data: {
                nome: body.nome ?? current.nome,
                descricao: body.descricao ?? current.descricao,
                foto: body.foto !== undefined ? body.foto : current.foto,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
    }
}

// ── DELETE /api/extras/:id ────────────────────────────────────────────────
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    try {
        await prisma.elementoExtra.delete({ where: { id: params.id } });
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Erro ao remover" }, { status: 500 });
    }
}
