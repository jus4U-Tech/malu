// src/app/api/foto/[id]/thumb/route.ts
// Serve o thumbnail de uma foto pelo ID
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { data: foto, error } = await supabase
            .from("fotos")
            .select("thumbnail, url")
            .eq("id", params.id)
            .single();

        if (error || !foto) {
            return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
        }

        // Se tem thumbnail, usar. Senão, fallback para a foto full.
        const source = foto.thumbnail || foto.url;

        if (source.startsWith("data:")) {
            const match = source.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                const buffer = Buffer.from(match[2], "base64");
                return new NextResponse(buffer, {
                    headers: {
                        "Content-Type": match[1],
                        "Cache-Control": "public, max-age=31536000, immutable",
                    },
                });
            }
        }

        return NextResponse.redirect(source);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao buscar thumbnail" }, { status: 500 });
    }
}
