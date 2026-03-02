// src/app/api/participantes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── GET /api/participantes ─────────────────────────────────────────────────
export async function GET() {
  try {
    const participantes = await prisma.participante.findMany({
      include: { fotos: { orderBy: { ordem: "asc" } } },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(participantes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao buscar participantes" }, { status: 500 });
  }
}

// ── POST /api/participantes ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, palpite, fotos = [] } = body;

    if (!nome?.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
    }

    // Validar palpite — aceita DD/MM ou DD/MM/AAAA
    if (palpite && !/^\d{2}\/\d{2}(\/\d{4})?$/.test(palpite)) {
      return NextResponse.json({ error: "Palpite deve ser DD/MM ou DD/MM/AAAA" }, { status: 400 });
    }

    // Verificar duplicata
    const existing = await prisma.participante.findFirst({
      where: { nome: { equals: nome.trim(), mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: `"${nome}" já está cadastrado` }, { status: 409 });
    }

    const participante = await prisma.participante.create({
      data: {
        nome: nome.trim(),
        palpite: palpite || null,
        fotos: {
          create: fotos.map((f: { url: string; original?: boolean }, i: number) => ({
            url: f.url,
            original: f.original ?? true,
            ordem: i,
          })),
        },
      },
      include: { fotos: true },
    });

    return NextResponse.json(participante, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar participante" }, { status: 500 });
  }
}
