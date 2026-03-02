// src/app/api/participantes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── GET /api/participantes/:id ─────────────────────────────────────────────
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const p = await prisma.participante.findUnique({
    where: { id: params.id },
    include: { fotos: { orderBy: { ordem: "asc" } } },
  });
  if (!p) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(p);
}

// ── PATCH /api/participantes/:id ───────────────────────────────────────────
// Regra de negócio: palpite não pode ser alterado após definido
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const current = await prisma.participante.findUnique({ where: { id: params.id } });
    if (!current) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Bloquear alteração de palpite se já definido
    if (body.palpite && current.palpite && body.palpite !== current.palpite) {
      return NextResponse.json(
        { error: "Palpite não pode ser alterado após definido" },
        { status: 422 }
      );
    }

    const updated = await prisma.participante.update({
      where: { id: params.id },
      data: {
        nome: body.nome ?? current.nome,
        // Só aceita palpite se ainda não estava definido
        palpite: current.palpite ?? body.palpite ?? null,
      },
      include: { fotos: { orderBy: { ordem: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// ── DELETE /api/participantes/:id ──────────────────────────────────────────
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.participante.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao remover" }, { status: 500 });
  }
}
