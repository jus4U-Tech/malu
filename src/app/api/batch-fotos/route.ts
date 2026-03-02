import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ONE-TIME: Processa todas as fotos existentes com o PRD via Gemini 2.5 Flash Image
export async function POST() {
    try {
        const config = await prisma.config.findFirst();
        const prdPrompt = config?.prdFotos?.trim();

        if (!prdPrompt) {
            return NextResponse.json({ error: "PRD de fotos não configurado" }, { status: 400 });
        }

        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            return NextResponse.json({ error: "GEMINI_API_KEY não configurada" }, { status: 400 });
        }

        const fotos = await prisma.foto.findMany({
            include: { participante: { select: { nome: true } } },
        });

        console.log(`[batch] Processando ${fotos.length} fotos com PRD: "${prdPrompt.slice(0, 80)}"`);

        const results: { id: string; nome: string; status: string }[] = [];
        let processed = 0;
        let failed = 0;

        // gemini-2.5-flash-image — comprovadamente retorna imagens via API
        const model = "gemini-2.5-flash-image";

        for (const foto of fotos) {
            const nome = foto.participante?.nome || "?";
            console.log(`[batch] ${processed + failed + 1}/${fotos.length} - ${nome}...`);

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
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
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
                            generationConfig: {
                                responseModalities: ["IMAGE", "TEXT"],
                            },
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

                // Procurar imagem (suporte camelCase e snake_case)
                const parts = data.candidates?.[0]?.content?.parts || [];
                let newUrl: string | null = null;
                for (const part of parts) {
                    if (part.inlineData?.data) {
                        const m = part.inlineData.mimeType || "image/png";
                        newUrl = `data:${m};base64,${part.inlineData.data}`;
                        break;
                    }
                    if (part.inline_data?.data) {
                        const m = part.inline_data.mime_type || "image/png";
                        newUrl = `data:${m};base64,${part.inline_data.data}`;
                        break;
                    }
                }

                if (newUrl) {
                    await prisma.foto.update({
                        where: { id: foto.id },
                        data: { url: newUrl, original: false },
                    });
                    processed++;
                    results.push({ id: foto.id, nome, status: "OK ✓" });
                    console.log(`[batch] ✓ ${nome}`);
                } else {
                    results.push({ id: foto.id, nome, status: "FAIL - sem imagem na resposta" });
                    failed++;
                }

                // Delay entre chamadas
                await new Promise(r => setTimeout(r, 2000));

            } catch (err) {
                const msg = err instanceof Error ? err.message : "erro";
                results.push({ id: foto.id, nome, status: `FAIL - ${msg}` });
                failed++;
            }
        }

        console.log(`[batch] Concluído! ${processed}/${fotos.length} processadas, ${failed} falhas`);

        return NextResponse.json({ total: fotos.length, processed, failed, results });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        console.error("[batch] Fatal:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
