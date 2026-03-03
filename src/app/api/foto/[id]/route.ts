// src/app/api/foto/[id]/route.ts
// Serve uma foto individual pelo ID (retorna o base64 ou redireciona para URL)
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { data: foto, error } = await supabase
            .from("fotos")
            .select("url")
            .eq("id", params.id)
            .single();

        if (error || !foto) {
            return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
        }

        const url = foto.url;

        // Se é base64 data URI, extrair o binário e servir como imagem
        if (url.startsWith("data:")) {
            const match = url.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                const mimeType = match[1];
                const buffer = Buffer.from(match[2], "base64");
                return new NextResponse(buffer, {
                    headers: {
                        "Content-Type": mimeType,
                        "Cache-Control": "public, max-age=31536000, immutable",
                    },
                });
            }
        }

        // Se é uma URL normal, redirecionar
        return NextResponse.redirect(url);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao buscar foto" }, { status: 500 });
    }
}
