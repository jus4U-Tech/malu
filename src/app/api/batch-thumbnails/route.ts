// src/app/api/batch-thumbnails/route.ts
// TEMPORÁRIO — Gera thumbnails para todas as fotos existentes
// Usa sharp para redimensionar (200px WebP)
// Grava em PRODUÇÃO (Supabase) + LOCAL (Docker via Prisma)
// SSE (Server-Sent Events) para progresso em tempo real

import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min

export async function POST() {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (event: string, data: Record<string, unknown>) => {
                try {
                    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
                } catch { /* stream closed */ }
            };

            try {
                // ── Conectar ao Supabase de produção ────────────────────────
                const prodUrl = process.env.PROD_SUPABASE_URL || "";
                const prodKey = process.env.PROD_SUPABASE_KEY || "";

                if (!prodUrl || !prodKey) {
                    send("error", { message: "PROD_SUPABASE_URL/KEY não configuradas" });
                    controller.close();
                    return;
                }

                const prod = createClient(prodUrl, prodKey);

                // ── Verificar se coluna thumbnail existe no Supabase ────────
                const { error: colCheck } = await prod
                    .from("fotos")
                    .select("thumbnail")
                    .limit(1);

                if (colCheck && colCheck.message?.includes("thumbnail")) {
                    send("error", {
                        message: "Coluna 'thumbnail' não existe no Supabase de produção. Execute no SQL Editor: ALTER TABLE fotos ADD COLUMN thumbnail TEXT;"
                    });
                    controller.close();
                    return;
                }

                // ── Buscar fotos sem thumbnail ──────────────────────────────
                const { data: fotos, error: fotosErr } = await prod
                    .from("fotos")
                    .select("id, participanteId, url")
                    .is("thumbnail", null);

                if (fotosErr) throw fotosErr;

                // Buscar nomes dos participantes
                const { data: parts } = await prod
                    .from("participantes")
                    .select("id, nome");
                const nameMap = new Map((parts || []).map((p: { id: string; nome: string }) => [p.id, p.nome]));

                const total = fotos?.length || 0;
                send("init", { total });

                if (total === 0) {
                    send("done", { total: 0, processed: 0, failed: 0 });
                    controller.close();
                    return;
                }

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
                        // ── Extrair buffer da imagem ────────────────────────────
                        let imageBuffer: Buffer;

                        if (foto.url.startsWith("data:")) {
                            const match = foto.url.match(/^data:([^;]+);base64,(.+)$/);
                            if (!match) {
                                send("progress", { current: i + 1, total, nome, status: "skip", reason: "formato inválido", processed, failed: ++failed });
                                continue;
                            }
                            imageBuffer = Buffer.from(match[2], "base64");
                        } else {
                            const imgRes = await fetch(foto.url);
                            imageBuffer = Buffer.from(await imgRes.arrayBuffer());
                        }

                        // ── Gerar thumbnail com sharp ───────────────────────────
                        const thumbBuffer = await sharp(imageBuffer)
                            .resize(200, null, { withoutEnlargement: true })
                            .webp({ quality: 70 })
                            .toBuffer();

                        const thumbBase64 = `data:image/webp;base64,${thumbBuffer.toString("base64")}`;

                        // ── Gravar em PRODUÇÃO (Supabase) ───────────────────────
                        const { error: prodErr } = await prod
                            .from("fotos")
                            .update({ thumbnail: thumbBase64 })
                            .eq("id", foto.id);
                        if (prodErr) {
                            console.error(`[batch-thumbnails] Erro PROD para ${nome}:`, prodErr.message);
                            send("progress", { current: i + 1, total, nome, status: "fail", reason: `PROD: ${prodErr.message}`, processed, failed: ++failed });
                            continue;
                        }

                        // ── Gravar em LOCAL (Docker via Prisma) ─────────────────
                        try {
                            await prisma.foto.update({
                                where: { id: foto.id },
                                data: { thumbnail: thumbBase64 },
                            });
                        } catch (localErr) {
                            // Foto pode não existir no local — só logar
                            console.log(`[batch-thumbnails] Local skip para ${nome}: foto não existe no Docker`);
                        }

                        processed++;
                        send("progress", { current: i + 1, total, nome, status: "ok", processed, failed });
                        console.log(`[batch-thumbnails] ✓ ${i + 1}/${total} ${nome}`);
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : "erro";
                        console.error(`[batch-thumbnails] Erro para ${nome}:`, msg);
                        send("progress", { current: i + 1, total, nome, status: "fail", reason: msg, processed, failed: ++failed });
                    }
                }

                send("done", { total, processed, failed });
                console.log(`[batch-thumbnails] Concluído! ${processed}/${total} ok, ${failed} falhas`);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : JSON.stringify(e) || "Erro desconhecido";
                console.error("[batch-thumbnails] Fatal:", e);
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
