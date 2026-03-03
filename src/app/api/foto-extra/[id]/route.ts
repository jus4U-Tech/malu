// src/app/api/foto-extra/[id]/route.ts
// Serve a foto de um elemento extra pelo ID
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        const supabase = createClient(url, key);

        const { data, error } = await supabase
            .from("elementos_extras")
            .select("foto")
            .eq("id", params.id)
            .single();

        if (error || !data?.foto) {
            return new NextResponse(null, { status: 404 });
        }

        const foto = data.foto;
        if (foto.startsWith("data:")) {
            const match = foto.match(/^data:([^;]+);base64,(.+)$/);
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

        return NextResponse.redirect(foto);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Erro ao buscar foto" }, { status: 500 });
    }
}
