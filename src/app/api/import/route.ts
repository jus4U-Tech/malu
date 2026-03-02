import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { texto, geminiKey } = await req.json();

        if (!texto?.trim()) {
            return NextResponse.json({ error: "Texto vazio" }, { status: 400 });
        }

        // Usa a key passada pelo cliente ou a do ambiente (prioridade para a do ambiente)
        const key = process.env.GEMINI_API_KEY || geminiKey;
        if (!key) {
            return NextResponse.json({ error: "Gemini API Key não configurada" }, { status: 400 });
        }

        const anoAtual = new Date().getFullYear();
        const anoSeguinte = anoAtual + 1;
        const prompt = `Extraia participantes e palpites da lista abaixo.
Retorne APENAS JSON válido: {"participantes":[{"nome":"string","palpite":"DD/MM/AAAA"}]}

Regras para o campo "palpite" (formato final sempre DD/MM/AAAA com ano completo de 4 dígitos):
1. Se a data vier no formato DD/MM com 4 dígitos (ex: 07/03, 28/12), DD é o dia e MM é o mês — use o ano ${anoAtual} salvo que a regra 4 se aplique.
2. Se a data vier como MM/AA (apenas mês e ano abreviado, ex: 03/25), use o dia 01 como dia e converta o ano: 25→${anoAtual}, 26→${anoSeguinte}.
3. Se a data vier com ano completo (ex: 07/03/2025), use diretamente.
4. VIRADA DE ANO: Se a lista tiver sequência de meses onde os meses "voltam" (ex: 11→12→01→02), significa virada de ano. Meses antes da queda usam ${anoAtual}, meses depois da queda (incluindo 01) usam ${anoSeguinte}.
   Exemplo: [...12/12...] depois [...07/01...] → o 12/12 é ${anoAtual}, o 07/01 é ${anoSeguinte} → "12/12/${anoAtual}" e "07/01/${anoSeguinte}"
5. Converta meses por extenso: jan=01 fev=02 mar=03 abr=04 mai=05 jun=06 jul=07 ago=08 set=09 out=10 nov=11 dez=12
6. Se não houver data, use "".

Lista:
${texto}`;

        const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
                }),
            }
        );

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error?.message || "Erro na API Gemini");
        }

        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const parsed = JSON.parse(raw);

        return NextResponse.json(parsed);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
