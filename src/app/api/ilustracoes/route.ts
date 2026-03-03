// src/app/api/ilustracoes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getSupabase() {
    const url = process.env.PROD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.PROD_SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    return createClient(url, key);
}

// GET — Lista ilustrações (opcionalmente filtrar por autorId)
export async function GET(req: NextRequest) {
    try {
        const supabase = getSupabase();
        const autorId = req.nextUrl.searchParams.get("autorId");

        let query = supabase
            .from("ilustracoes")
            .select("*")
            .order("createdAt", { ascending: false });

        if (autorId) {
            query = query.eq("autorId", autorId);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Buscar nomes dos autores
        const autorIds = Array.from(new Set((data || []).map((i: any) => i.autorId)));
        const { data: autores } = await supabase
            .from("participantes")
            .select("id, nome")
            .in("id", autorIds);
        const nameMap = new Map((autores || []).map((a: any) => [a.id, a.nome]));

        const result = (data || []).map((i: any) => ({
            ...i,
            autor: { nome: nameMap.get(i.autorId) || "?" },
        }));

        return NextResponse.json(result);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// POST — Salva uma ilustração aprovada
export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabase();
        const { autorId, prompt, url, participantes, extras, estilo } = await req.json();

        if (!autorId || !prompt || !url) {
            return NextResponse.json({ error: "autorId, prompt e url são obrigatórios" }, { status: 400 });
        }

        const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
        const { data, error } = await supabase
            .from("ilustracoes")
            .insert({
                id,
                autorId,
                prompt,
                estilo: estilo || "",
                url,
                participantes: participantes || [],
                extras: extras || [],
            })
            .select()
            .single();

        if (error) throw error;

        // Buscar nome do autor
        const { data: autor } = await supabase
            .from("participantes")
            .select("nome")
            .eq("id", autorId)
            .single();

        return NextResponse.json({ ...data, autor: { nome: autor?.nome || "?" } });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : JSON.stringify(e);
        console.error("[ilustracoes] POST error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// DELETE — Exclui uma ilustração (admin)
export async function DELETE(req: NextRequest) {
    try {
        const supabase = getSupabase();
        const id = req.nextUrl.searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
        }

        const { error } = await supabase
            .from("ilustracoes")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ ok: true });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro";
        console.error("[ilustracoes] DELETE error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
