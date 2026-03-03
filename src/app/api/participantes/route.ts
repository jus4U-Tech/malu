// src/app/api/participantes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import sharp from "sharp";

export const dynamic = "force-dynamic";

// ── GET /api/participantes ─────────────────────────────────────────────────
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("participantes")
      .select("*, fotos(*)")
      .order("nome");

    if (error) throw error;

    // Ordenar fotos por ordem
    const participantes = (data || []).map((p) => ({
      ...p,
      fotos: (p.fotos || []).sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem),
    }));

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

    if (palpite && !/^\d{2}\/\d{2}(\/\d{4})?$/.test(palpite)) {
      return NextResponse.json({ error: "Palpite deve ser DD/MM ou DD/MM/AAAA" }, { status: 400 });
    }

    // Verificar duplicata (case insensitive)
    const { data: existing } = await supabase
      .from("participantes")
      .select("id")
      .ilike("nome", nome.trim())
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({ error: `"${nome}" já está cadastrado` }, { status: 409 });
    }

    // Criar participante
    const { data: participante, error } = await supabase
      .from("participantes")
      .insert({ nome: nome.trim(), palpite: palpite || null })
      .select()
      .single();

    if (error) throw error;

    // Criar fotos
    if (fotos.length > 0) {
      const fotosData = fotos.map((f: { url: string; original?: boolean }, i: number) => ({
        participanteId: participante.id,
        url: f.url,
        original: f.original ?? true,
        ordem: i,
      }));
      const { data: insertedFotos } = await supabase.from("fotos").insert(fotosData).select();

      // Auto-gerar thumbnails para cada foto inserida
      if (insertedFotos) {
        for (const foto of insertedFotos) {
          try {
            let imageBuffer: Buffer | undefined;
            if (foto.url.startsWith("data:")) {
              const match = foto.url.match(/^data:([^;]+);base64,(.+)$/);
              if (match) imageBuffer = Buffer.from(match[2], "base64");
            } else {
              const imgRes = await fetch(foto.url);
              imageBuffer = Buffer.from(await imgRes.arrayBuffer());
            }
            if (imageBuffer) {
              const thumbBuffer = await sharp(imageBuffer)
                .resize(200, null, { withoutEnlargement: true })
                .webp({ quality: 70 })
                .toBuffer();
              const thumbBase64 = `data:image/webp;base64,${thumbBuffer.toString("base64")}`;
              await supabase.from("fotos").update({ thumbnail: thumbBase64 }).eq("id", foto.id);
            }
          } catch (thumbErr) {
            console.error(`[participantes] Erro thumb foto ${foto.id}:`, thumbErr);
          }
        }
      }
    }

    // Retornar com fotos
    const { data: result } = await supabase
      .from("participantes")
      .select("*, fotos(*)")
      .eq("id", participante.id)
      .single();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro ao criar participante" }, { status: 500 });
  }
}
