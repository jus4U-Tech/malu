// src/app/api/extras/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// ── PATCH /api/extras/:id ─────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const body = await req.json();

        const { data: current } = await supabase
            .from("elementos_extras")
            .select("*")
            .eq("id", params.id)
            .single();

        if (!current) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

        const { data: updated, error } = await supabase
            .from("elementos_extras")
            .update({
                nome: body.nome ?? current.nome,
                descricao: body.descricao ?? current.descricao,
                foto: body.foto !== undefined ? body.foto : current.foto,
            })
            .eq("id", params.id)
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(updated);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
    }
}

// ── DELETE /api/extras/:id ────────────────────────────────────────────────
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { error } = await supabase
            .from("elementos_extras")
            .delete()
            .eq("id", params.id);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Erro ao remover" }, { status: 500 });
    }
}
