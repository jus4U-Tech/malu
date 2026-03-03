// src/app/api/batch-fotos/route.ts
// Processa todas as fotos existentes com o PRD via Gemini 2.5 Flash Image
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min (Vercel Pro) ou 10s (Hobby)

export async function POST() {
    try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
        const supabase = createClient(url, key);

        // Buscar config com PRD
        const { data: config } = await supabase
            .from("config")
            .select("prdFotos")
            .eq("id", "singleton")
            .single();

        const prdPrompt = config?.prdFotos?.trim();
        if (!prdPrompt) {
            return NextResponse.json({ error: "PRD de fotos não configurado" }, { status: 400 });
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 400 });
        }

        // Buscar apenas fotos originais (não re-processar as já tratadas)
        const { data: fotos, error: fotosErr } = await supabase
            .from("fotos")
            .select("id, participanteId, url, original")
            .eq("original", true);

        if (fotosErr) throw fotosErr;

        // Buscar nomes dos participantes
        const { data: parts } = await supabase
            .from("participantes")
            .select("id, nome");
        const nameMap = new Map((parts || []).map((p: any) => [p.id, p.nome]));

        console.log(`[batch] Processando ${fotos?.length || 0} fotos originais com PRD`);

        const results: { id: string; nome: string; status: string }[] = [];
        let processed = 0;
        let failed = 0;
        const model = "gemini-3-pro-image-preview";

        for (const foto of fotos || []) {
            const nome = nameMap.get(foto.participanteId) || "?";
            console.log(`[batch] ${processed + failed + 1}/${fotos!.length} - ${nome}...`);

            try {
                let imageBase64: string;
                let mimeType: string;

                if (foto.url.startsWith("data:")) {
                    const match = foto.url.match(/^data:([^;]+);base64,(.+)$/);
                    if (!match) {
                        results.push({ id: foto.id, nome, status: "SKIP - formato inválido" });
                        failed++;
                        continue;
                    }
                    mimeType = match[1];
                    imageBase64 = match[2];
                } else {
                    const imgRes = await fetch(foto.url);
                    const buf = Buffer.from(await imgRes.arrayBuffer());
                    imageBase64 = buf.toString("base64");
                    mimeType = imgRes.headers.get("content-type") || "image/jpeg";
                }

                const prompt = `${prdPrompt}\n\nAplique a instrução acima na imagem fornecida. Retorne APENAS a imagem resultante.`;

                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: prompt },
                                    { inline_data: { mime_type: mimeType, data: imageBase64 } }
                                ]
                            }],
                            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
                        }),
                    }
                );

                const data = await res.json();

                if (!res.ok) {
                    console.error(`[batch] API ${res.status} para ${nome}`);
                    results.push({ id: foto.id, nome, status: `FAIL - API ${res.status}` });
                    failed++;
                    continue;
                }

                const apiParts = data.candidates?.[0]?.content?.parts || [];
                let newUrl: string | null = null;
                for (const part of apiParts) {
                    if (part.inlineData?.data) {
                        newUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                        break;
                    }
                    if (part.inline_data?.data) {
                        newUrl = `data:${part.inline_data.mime_type || "image/png"};base64,${part.inline_data.data}`;
                        break;
                    }
                }

                if (newUrl) {
                    const { error: updateErr } = await supabase
                        .from("fotos")
                        .update({ url: newUrl, original: false })
                        .eq("id", foto.id);
                    if (updateErr) throw updateErr;
                    processed++;
                    results.push({ id: foto.id, nome, status: "OK ✓" });
                    console.log(`[batch] ✓ ${nome}`);
                } else {
                    results.push({ id: foto.id, nome, status: "FAIL - sem imagem na resposta" });
                    failed++;
                }

                await new Promise(r => setTimeout(r, 2000));
            } catch (err) {
                const msg = err instanceof Error ? err.message : "erro";
                results.push({ id: foto.id, nome, status: `FAIL - ${msg}` });
                failed++;
            }
        }

        console.log(`[batch] Concluído! ${processed}/${fotos!.length} processadas, ${failed} falhas`);
        return NextResponse.json({ total: fotos!.length, processed, failed, results });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        console.error("[batch] Fatal:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
