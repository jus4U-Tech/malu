// src/app/api/extras/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// ── GET /api/extras ─────────────────────────────────────────────────────────
export async function GET() {
    try {
        const { data, error } = await supabase
            .from("elementos_extras")
            .select("*")
            .order("createdAt");

        if (error) throw error;
        return NextResponse.json(data || []);
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

        const { data: extra, error } = await supabase
            .from("elementos_extras")
            .insert({
                nome: nome.trim(),
                descricao: descricao || "",
                foto: foto || null,
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(extra, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao criar elemento" }, { status: 500 });
    }
}
