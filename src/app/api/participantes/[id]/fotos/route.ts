// src/app/api/participantes/[id]/fotos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import sharp from "sharp";

export const dynamic = "force-dynamic";

// ── POST /api/participantes/:id/fotos ──────────────────────────────────────
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { url, original = true } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL da foto é obrigatória" }, { status: 400 });
        }

        // Verificar se participante existe
        const { data: part } = await supabase
            .from("participantes")
            .select("id")
            .eq("id", params.id)
            .single();

        if (!part) {
            return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 });
        }

        // Contar fotos para definir ordem
        const { count } = await supabase
            .from("fotos")
            .select("id", { count: "exact", head: true })
            .eq("participanteId", params.id);

        const { data: foto, error } = await supabase
            .from("fotos")
            .insert({
                participanteId: params.id,
                url,
                original,
                ordem: count || 0,
            })
            .select()
            .single();

        if (error) throw error;

        // ── Auto-gerar thumbnail ────────────────────────────────────────
        try {
            let imageBuffer: Buffer;
            if (url.startsWith("data:")) {
                const match = url.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    imageBuffer = Buffer.from(match[2], "base64");
                }
            } else {
                const imgRes = await fetch(url);
                imageBuffer = Buffer.from(await imgRes.arrayBuffer());
            }

            if (imageBuffer!) {
                const thumbBuffer = await sharp(imageBuffer)
                    .resize(200, null, { withoutEnlargement: true })
                    .webp({ quality: 70 })
                    .toBuffer();
                const thumbBase64 = `data:image/webp;base64,${thumbBuffer.toString("base64")}`;

                await supabase
                    .from("fotos")
                    .update({ thumbnail: thumbBase64 })
                    .eq("id", foto.id);

                console.log(`[fotos] Thumbnail gerado para foto ${foto.id}`);
            }
        } catch (thumbErr) {
            console.error("[fotos] Erro ao gerar thumbnail:", thumbErr);
            // Não falhar a request por causa do thumbnail
        }

        return NextResponse.json(foto, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao salvar foto" }, { status: 500 });
    }
}

// ── DELETE /api/participantes/:id/fotos ─────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { searchParams } = new URL(req.url);
        const idx = parseInt(searchParams.get("idx") || "-1", 10);

        if (idx < 0) {
            return NextResponse.json({ error: "Índice inválido" }, { status: 400 });
        }

        // Buscar fotos ordenadas
        const { data: fotos } = await supabase
            .from("fotos")
            .select("id")
            .eq("participanteId", params.id)
            .order("ordem");

        if (!fotos || idx >= fotos.length) {
            return NextResponse.json({ error: "Índice fora do range" }, { status: 404 });
        }

        const { error } = await supabase
            .from("fotos")
            .delete()
            .eq("id", fotos[idx].id);

        if (error) throw error;
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao remover foto" }, { status: 500 });
    }
}
