// migrate-to-supabase.js
// Migra dados do banco local Docker para o novo Supabase ManuBase
// Executa em etapas com barra de progresso

const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@supabase/supabase-js");

// ── Configuração ──────────────────────────────────────────────────────────
const LOCAL_DB = "postgresql://postgres:postgres@localhost:5432/bbb_malu";
const SUPA_URL = "https://aecalkpcqxgpdtqetcqs.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlY2Fsa3BjcXhncGR0cWV0Y3FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjUwNjQ1NywiZXhwIjoyMDg4MDgyNDU3fQ.hLvLprdwhMj_uDYNrIR18G9Lt8IqJguN5JPae9_Wrj4";

const prisma = new PrismaClient({ datasources: { db: { url: LOCAL_DB } } });
const supabase = createClient(SUPA_URL, SUPA_KEY);

// ── Barra de progresso ────────────────────────────────────────────────────
function progress(label, current, total) {
    const pct = Math.round((current / total) * 100);
    const barLen = 30;
    const filled = Math.round((current / total) * barLen);
    const bar = "█".repeat(filled) + "░".repeat(barLen - filled);
    process.stdout.write(`\r  ${bar} ${pct}% (${current}/${total}) ${label}`);
    if (current === total) console.log(" ✅");
}

// ── Migração ──────────────────────────────────────────────────────────────
async function migrate() {
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║   Migração: Docker Local → Supabase ManuBase        ║");
    console.log("╚══════════════════════════════════════════════════════╝\n");

    // ── 1. Config ─────────────────────────────────────────────────────────
    console.log("📋 Etapa 1/5: Config");
    const config = await prisma.config.findUnique({ where: { id: "singleton" } });
    if (config) {
        const { error } = await supabase.from("config").upsert({
            id: "singleton",
            prdFotos: config.prdFotos || "",
            prdIlustracoes: config.prdIlustracoes || "",
            appName: config.appName || "Big Brother Malú",
            appUrl: config.appUrl || "",
            updatedAt: config.updatedAt?.toISOString() || new Date().toISOString(),
        });
        if (error) throw new Error(`Config: ${error.message}`);
        progress("Config", 1, 1);
    } else {
        console.log("  Nenhuma config encontrada, pulando.");
    }

    // ── 2. Participantes (sem fotos) ──────────────────────────────────────
    console.log("\n👥 Etapa 2/5: Participantes");
    const participantes = await prisma.participante.findMany({ orderBy: { nome: "asc" } });
    for (let i = 0; i < participantes.length; i++) {
        const p = participantes[i];
        const { error } = await supabase.from("participantes").upsert({
            id: p.id,
            nome: p.nome,
            palpite: p.palpite || null,
            createdAt: p.createdAt.toISOString(),
            updatedAt: p.updatedAt.toISOString(),
        });
        if (error) console.log(`\n  ⚠️ ${p.nome}: ${error.message}`);
        progress(p.nome, i + 1, participantes.length);
    }

    // ── 3. Extras ─────────────────────────────────────────────────────────
    console.log("\n🎭 Etapa 3/5: Elementos Extras");
    const extras = await prisma.elementoExtra.findMany();
    for (let i = 0; i < extras.length; i++) {
        const e = extras[i];
        const { error } = await supabase.from("elementos_extras").upsert({
            id: e.id,
            nome: e.nome,
            descricao: e.descricao || "",
            foto: e.foto || null,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
        });
        if (error) console.log(`\n  ⚠️ ${e.nome}: ${error.message}`);
        progress(e.nome, i + 1, extras.length);
    }

    // ── 4. Fotos (uma por uma — são grandes em base64) ────────────────────
    console.log("\n📸 Etapa 4/5: Fotos");
    const fotos = await prisma.foto.findMany({ orderBy: { createdAt: "asc" } });
    let fotoOk = 0, fotoFail = 0;
    for (let i = 0; i < fotos.length; i++) {
        const f = fotos[i];
        const { error } = await supabase.from("fotos").upsert({
            id: f.id,
            participanteId: f.participanteId,
            url: f.url,
            original: f.original,
            ordem: f.ordem,
            createdAt: f.createdAt.toISOString(),
        });
        if (error) {
            fotoFail++;
            console.log(`\n  ⚠️ Foto ${f.id}: ${error.message}`);
        } else {
            fotoOk++;
        }
        progress(`OK:${fotoOk} Fail:${fotoFail}`, i + 1, fotos.length);
    }

    // ── 5. Ilustrações (uma por uma — são grandes em base64) ──────────────
    console.log("\n🎨 Etapa 5/5: Ilustrações");
    const ilustracoes = await prisma.ilustracao.findMany({ orderBy: { createdAt: "asc" } });
    let iluOk = 0, iluFail = 0;
    for (let i = 0; i < ilustracoes.length; i++) {
        const il = ilustracoes[i];
        const { error } = await supabase.from("ilustracoes").upsert({
            id: il.id,
            autorId: il.autorId,
            prompt: il.prompt,
            estilo: il.estilo || "",
            url: il.url,
            participantes: il.participantes || [],
            extras: il.extras || [],
            createdAt: il.createdAt.toISOString(),
        });
        if (error) {
            iluFail++;
            console.log(`\n  ⚠️ Ilustração ${il.id}: ${error.message}`);
        } else {
            iluOk++;
        }
        progress(`OK:${iluOk} Fail:${iluFail}`, i + 1, ilustracoes.length);
    }

    // ── Resumo ────────────────────────────────────────────────────────────
    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log(`║  Config:        ${config ? "✅" : "⏭️ "}                                    ║`);
    console.log(`║  Participantes: ${participantes.length} migrados                          ║`);
    console.log(`║  Extras:        ${extras.length} migrados                           ║`);
    console.log(`║  Fotos:         ${fotoOk} OK, ${fotoFail} falhas                       ║`);
    console.log(`║  Ilustrações:   ${iluOk} OK, ${iluFail} falhas                       ║`);
    console.log("╚══════════════════════════════════════════════════════╝");

    await prisma.$disconnect();
}

migrate().catch((err) => {
    console.error("\n❌ Erro na migração:", err.message);
    process.exit(1);
});
