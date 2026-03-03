// src/app/api/batch-reprocess/route.ts
// TEMPORÁRIO — Rotina batch que reprocessa todas as fotos existentes
// Lê do Supabase PRODUÇÃO, grava em PRODUÇÃO + TESTE
// Usa SSE (Server-Sent Events) para progresso em tempo real

import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min

export async function POST() {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: string, data: Record<string, unknown>) => {
                controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
            };

            try {
                // ── Conectar aos dois Supabase ──────────────────────────────
                const prodUrl = process.env.PROD_SUPABASE_URL || "";
                const prodKey = process.env.PROD_SUPABASE_KEY || "";
                const testUrl = process.env.TEST_SUPABASE_URL || "";
                const testKey = process.env.TEST_SUPABASE_KEY || "";

                if (!prodUrl || !prodKey) {
                    send("error", { message: "PROD_SUPABASE_URL/KEY não configuradas" });
                    controller.close();
                    return;
                }

                const prod = createClient(prodUrl, prodKey);
                const test = testUrl && testKey ? createClient(testUrl, testKey) : null;

                // ── Buscar PRD prompt ───────────────────────────────────────
                const { data: config, error: configErr } = await prod
                    .from("config")
                    .select("prdFotos")
                    .eq("id", "singleton")
                    .single();

                console.log("[batch-reprocess] config query result:", { config, error: configErr });

                if (configErr) {
                    send("error", { message: `Erro ao buscar config: ${configErr.message}` });
                    controller.close();
                    return;
                }

                const prdPrompt = config?.prdFotos?.trim();
                if (!prdPrompt) {
                    send("error", { message: "PRD de fotos não configurado no banco de produção" });
                    controller.close();
                    return;
                }

                const geminiKey = process.env.GEMINI_API_KEY;
                if (!geminiKey) {
                    send("error", { message: "GEMINI_API_KEY não configurada" });
                    controller.close();
                    return;
                }

                // ── Buscar fotos originais ──────────────────────────────────
                const { data: fotos, error: fotosErr } = await prod
                    .from("fotos")
                    .select("id, participanteId, url, original")
                    .eq("original", true);

                if (fotosErr) throw fotosErr;

                // Buscar nomes dos participantes
                const { data: parts } = await prod
                    .from("participantes")
                    .select("id, nome");
                const nameMap = new Map((parts || []).map((p: { id: string; nome: string }) => [p.id, p.nome]));

                const total = fotos?.length || 0;
                send("init", { total, prdPrompt: prdPrompt.slice(0, 120) });

                if (total === 0) {
                    send("done", { total: 0, processed: 0, failed: 0 });
                    controller.close();
                    return;
                }

                const model = "gemini-3-pro-image-preview";
                let processed = 0;
                let failed = 0;

                for (let i = 0; i < total; i++) {
                    const foto = fotos![i];
                    const nome = nameMap.get(foto.participanteId) || "?";

                    send("progress", {
                        current: i + 1,
                        total,
                        nome,
                        status: "processing",
                        processed,
                        failed,
                    });

                    try {
                        // ── Extrair base64 da imagem ────────────────────────
                        let imageBase64: string;
                        let mimeType: string;

                        if (foto.url.startsWith("data:")) {
                            const match = foto.url.match(/^data:([^;]+);base64,(.+)$/);
                            if (!match) {
                                send("progress", { current: i + 1, total, nome, status: "skip", reason: "formato inválido", processed, failed: ++failed });
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

                        // ── Chamar Gemini ───────────────────────────────────
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
                                            { inline_data: { mime_type: mimeType, data: imageBase64 } },
                                        ],
                                    }],
                                    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
                                }),
                            }
                        );

                        const data = await res.json();

                        if (!res.ok) {
                            console.error(`[batch-reprocess] API ${res.status} para ${nome}:`, JSON.stringify(data).slice(0, 300));
                            send("progress", { current: i + 1, total, nome, status: "fail", reason: `API ${res.status}`, processed, failed: ++failed });
                            continue;
                        }

                        // ── Extrair imagem da resposta ──────────────────────
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
                            // ── Gravar em PRODUÇÃO ──────────────────────────
                            const { error: prodErr } = await prod
                                .from("fotos")
                                .update({ url: newUrl, original: false })
                                .eq("id", foto.id);
                            if (prodErr) {
                                console.error(`[batch-reprocess] Erro ao gravar PROD para ${nome}:`, prodErr.message);
                            }

                            // ── Gravar em TESTE ─────────────────────────────
                            if (test) {
                                const { error: testErr } = await test
                                    .from("fotos")
                                    .update({ url: newUrl, original: false })
                                    .eq("id", foto.id);
                                if (testErr) {
                                    console.error(`[batch-reprocess] Erro ao gravar TESTE para ${nome}:`, testErr.message);
                                }
                            }

                            processed++;
                            send("progress", { current: i + 1, total, nome, status: "ok", processed, failed });
                            console.log(`[batch-reprocess] ✓ ${i + 1}/${total} ${nome}`);
                        } else {
                            send("progress", { current: i + 1, total, nome, status: "fail", reason: "sem imagem na resposta", processed, failed: ++failed });
                        }

                        // Rate limiting — 2s entre chamadas
                        await new Promise(r => setTimeout(r, 2000));
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : "erro";
                        send("progress", { current: i + 1, total, nome, status: "fail", reason: msg, processed, failed: ++failed });
                    }
                }

                send("done", { total, processed, failed });
                console.log(`[batch-reprocess] Concluído! ${processed}/${total} ok, ${failed} falhas`);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : JSON.stringify(e) || "Erro desconhecido";
                console.error("[batch-reprocess] Fatal:", e);
                send("error", { message: msg });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    });
}
