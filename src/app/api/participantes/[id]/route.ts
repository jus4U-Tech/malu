// src/app/api/participantes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// ── GET /api/participantes/:id ─────────────────────────────────────────────
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { data: p, error } = await supabase
    .from("participantes")
    .select("*, fotos(*)")
    .eq("id", params.id)
    .single();

  if (error || !p) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  p.fotos = (p.fotos || []).sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);
  return NextResponse.json(p);
}

// ── PATCH /api/participantes/:id ───────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();

    const { data: current } = await supabase
      .from("participantes")
      .select("*")
      .eq("id", params.id)
      .single();

    if (!current) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Bloquear alteração de palpite se já definido
    if (body.palpite && current.palpite && body.palpite !== current.palpite) {
      return NextResponse.json(
        { error: "Palpite não pode ser alterado após definido" },
        { status: 422 }
      );
    }

    const { data: updated, error } = await supabase
      .from("participantes")
      .update({
        nome: body.nome ?? current.nome,
        palpite: current.palpite ?? body.palpite ?? null,
      })
      .eq("id", params.id)
      .select("*, fotos(*)")
      .single();

    if (error) throw error;

    if (updated) {
      updated.fotos = (updated.fotos || []).sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

// ── DELETE /api/participantes/:id ──────────────────────────────────────────
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabase
      .from("participantes")
      .delete()
      .eq("id", params.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao remover" }, { status: 500 });
  }
}
