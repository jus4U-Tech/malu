import { NextRequest, NextResponse } from "next/server";

// Recebe uma imagem em base64, aplica o prompt PRD via Gemini 2.5 Flash Image
// com geração de imagem nativa, e retorna a imagem processada em base64
export async function POST(req: NextRequest) {
    try {
        const { imageBase64, mimeType, prdPrompt, geminiKey } = await req.json();

        if (!imageBase64 || !mimeType) {
            return NextResponse.json({ error: "Imagem não fornecida" }, { status: 400 });
        }

        // Se não há PRD configurado, retorna a imagem original
        if (!prdPrompt?.trim()) {
            return NextResponse.json({ imageBase64, mimeType, processed: false });
        }

        const key = process.env.GEMINI_API_KEY || geminiKey;
        if (!key) {
            return NextResponse.json({ imageBase64, mimeType, processed: false });
        }

        const prompt = `${prdPrompt.trim()}

Aplique a instrução acima na imagem fornecida. Retorne APENAS a imagem resultante.`;

        // gemini-2.5-flash-image — modelo que comprovadamente retorna imagens via API
        const model = "gemini-2.5-flash-image";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        console.log(`[foto] Processando com modelo ${model}...`);
        console.log(`[foto] PRD: "${prdPrompt.trim().slice(0, 100)}"`);

        const res = await fetch(url, {
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
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("[foto] Gemini API error:", JSON.stringify(data).slice(0, 500));
            return NextResponse.json({ imageBase64, mimeType, processed: false });
        }

        // Procurar a imagem gerada nos parts da resposta
        // API retorna tanto camelCase (inlineData/mimeType) quanto snake_case (inline_data/mime_type)
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
            // Suporte camelCase (padrão REST API)
            if (part.inlineData?.data) {
                console.log("[foto] ✓ Imagem processada recebida (camelCase)!");
                return NextResponse.json({
                    imageBase64: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || "image/png",
                    processed: true,
                });
            }
            // Suporte snake_case (padrão SDK)
            if (part.inline_data?.data) {
                console.log("[foto] ✓ Imagem processada recebida (snake_case)!");
                return NextResponse.json({
                    imageBase64: part.inline_data.data,
                    mimeType: part.inline_data.mime_type || "image/png",
                    processed: true,
                });
            }
        }

        // Fallback: se não retornou imagem, retorna original
        const textParts = parts.filter((p: Record<string, unknown>) => p.text).map((p: Record<string, unknown>) => p.text);
        console.warn("[foto] Gemini não retornou imagem. Texto:", (textParts as string[]).join(" ").slice(0, 300));
        return NextResponse.json({ imageBase64, mimeType, processed: false });

    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        console.error("[foto] Error:", msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
