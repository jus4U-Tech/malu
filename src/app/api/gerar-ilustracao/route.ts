// src/app/api/gerar-ilustracao/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    return createClient(url, key);
}

// POST — gera ilustração via Gemini 2.5 Flash Image
export async function POST(req: NextRequest) {
    try {
        const { prompt, participanteIds, extraIds, stylePrompt } = await req.json();

        if (!prompt?.trim()) {
            return NextResponse.json({ error: "Prompt é obrigatório" }, { status: 400 });
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 500 });
        }

        const supabase = getSupabase();

        // Limitar: máx 4 participantes, 2 extras
        const safePartIds = (participanteIds || []).slice(0, 4);
        const safeExtraIds = (extraIds || []).slice(0, 2);

        // Buscar participantes e suas fotos
        let participantes: any[] = [];
        if (safePartIds.length > 0) {
            const { data: parts } = await supabase
                .from("participantes")
                .select("id, nome")
                .in("id", safePartIds);

            const { data: fotos } = await supabase
                .from("fotos")
                .select("id, participanteId, url")
                .in("participanteId", safePartIds)
                .order("createdAt", { ascending: false });

            participantes = (parts || []).map((p: any) => ({
                ...p,
                fotos: (fotos || []).filter((f: any) => f.participanteId === p.id),
            }));
        }

        // Buscar extras
        let extras: any[] = [];
        if (safeExtraIds.length > 0) {
            const { data } = await supabase
                .from("elementos_extras")
                .select("id, nome, foto")
                .in("id", safeExtraIds);
            extras = data || [];
        }

        // Buscar config para o PRD do sistema
        const { data: appConfig } = await supabase
            .from("config")
            .select("prdIlustracoes")
            .eq("id", "singleton")
            .single();
        const systemPrd = appConfig?.prdIlustracoes?.trim() || "";

        // Montar parts do payload
        const parts: Array<Record<string, unknown>> = [];

        let descricao = "";
        if (systemPrd) {
            descricao += `INSTRUÇÃO PRINCIPAL DO SISTEMA (prioridade máxima):\n${systemPrd}\n\n`;
        }
        if (stylePrompt?.trim()) {
            descricao += `ESTILO VISUAL (aplicar obrigatoriamente):\n${stylePrompt.trim()}\n\n`;
        }
        descricao += `PROMPT DO PARTICIPANTE (complementar):\n${prompt.trim()}`;

        const nomes: string[] = [];
        for (const p of participantes) nomes.push(p.nome);
        for (const e of extras) nomes.push(e.nome);

        if (nomes.length > 0) {
            descricao += `\n\nAs seguintes pessoas/elementos devem aparecer na ilustração: ${nomes.join(", ")}. Múltiplas fotos de referência podem ser fornecidas para cada pessoa — use TODAS as fotos para capturar a aparência real com máxima fidelidade.`;
        }

        parts.push({ text: descricao });

        // Adicionar imagens dos participantes
        for (const p of participantes) {
            const fotos = p.fotos || [];
            for (let i = 0; i < fotos.length; i++) {
                const foto = fotos[i];
                if (foto?.url?.startsWith("data:")) {
                    const match = foto.url.match(/^data:([^;]+);base64,(.+)$/);
                    if (match) {
                        parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
                        parts.push({ text: `Foto ${i + 1} de: ${p.nome}${fotos.length > 1 ? ` (${fotos.length} fotos no total)` : ""}` });
                    }
                }
            }
        }

        // Adicionar imagens dos extras
        for (const e of extras) {
            if (e.foto?.startsWith("data:")) {
                const match = e.foto.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                    parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
                    parts.push({ text: `A imagem acima é de: ${e.nome}` });
                }
            }
        }

        const debugInfo = {
            systemPrd: systemPrd || "(vazio)",
            stylePrompt: stylePrompt?.trim() || "(nenhum)",
            userPrompt: prompt.trim(),
            combinedPrompt: descricao,
            participantes: participantes.map((p: any) => ({ nome: p.nome, fotos: (p.fotos || []).length })),
            extras: extras.map((e: any) => ({ nome: e.nome, temFoto: !!e.foto })),
            totalParts: parts.length,
            model: "gemini-3-pro-image-preview",
        };

        // Chamar Gemini
        const model = "gemini-3-pro-image-preview";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

        const res = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("[gerar-ilustracao] API error:", JSON.stringify(data).slice(0, 500));
            return NextResponse.json({ error: `Gemini API ${res.status}` }, { status: 502 });
        }

        // Extrair imagem gerada
        const responseParts = data.candidates?.[0]?.content?.parts || [];
        for (const part of responseParts) {
            if (part.inlineData?.data) {
                const mime = part.inlineData.mimeType || "image/png";
                return NextResponse.json({
                    imageBase64: part.inlineData.data,
                    mimeType: mime,
                    url: `data:${mime};base64,${part.inlineData.data}`,
                    participantes: safePartIds,
                    extras: safeExtraIds,
                    debug: debugInfo,
                });
            }
            if (part.inline_data?.data) {
                const mime = part.inline_data.mime_type || "image/png";
                return NextResponse.json({
                    imageBase64: part.inline_data.data,
                    mimeType: mime,
                    url: `data:${mime};base64,${part.inline_data.data}`,
                    participantes: safePartIds,
                    extras: safeExtraIds,
                    debug: debugInfo,
                });
            }
        }

        const textParts = responseParts.filter((p: Record<string, unknown>) => p.text).map((p: Record<string, unknown>) => p.text);
        console.warn("[gerar-ilustracao] Sem imagem. Texto:", (textParts as string[]).join(" ").slice(0, 300));
        return NextResponse.json({ error: "A IA não gerou uma imagem. Tente outro prompt." }, { status: 422 });

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        console.error("[gerar-ilustracao] Error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
