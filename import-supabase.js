// Import data to new Supabase project ijaagkjymlidmbbaucig
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const TARGET_URL = "postgresql://postgres:123deOliveira4%24@db.ijaagkjymlidmbbaucig.supabase.co:5432/postgres";

const prisma = new PrismaClient({
    datasources: { db: { url: TARGET_URL } },
});

async function main() {
    // First, push schema by testing connection
    console.log("Testing connection...");
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    console.log("Existing tables:", tables.map(t => t.tablename).join(", ") || "(none)");

    // Check if tables exist
    const hasParticipante = tables.some(t => t.tablename === "Participante" || t.tablename === "participantes");
    if (!hasParticipante) {
        console.log("\nTables not created yet. Run 'npx prisma db push' first!");
        console.log("(Stop the dev server first if you get EPERM errors)");
        return;
    }

    // Load exported data
    const data = JSON.parse(fs.readFileSync("C:/tmp/bbb-malu-export.json", "utf8"));
    console.log("\nImporting data...");

    // Import participantes
    for (const p of data.participantes) {
        await prisma.participante.upsert({
            where: { id: p.id },
            update: {},
            create: { id: p.id, nome: p.nome, palpite: p.palpite, createdAt: new Date(p.createdAt) },
        });
    }
    console.log(`  Participantes: ${data.participantes.length}`);

    // Import fotos
    for (const f of data.fotos) {
        await prisma.foto.upsert({
            where: { id: f.id },
            update: {},
            create: {
                id: f.id,
                participanteId: f.participanteId,
                url: f.url,
                original: typeof f.original === "boolean" ? f.original : true,
                ordem: f.ordem,
                createdAt: new Date(f.createdAt),
            },
        });
    }
    console.log(`  Fotos: ${data.fotos.length}`);

    // Import ilustracoes
    for (const i of data.ilustracoes) {
        await prisma.ilustracao.upsert({
            where: { id: i.id },
            update: {},
            create: {
                id: i.id,
                participanteId: i.participanteId,
                url: i.url,
                prompt: i.prompt || "",
                autorId: i.autorId || null,
                createdAt: new Date(i.createdAt),
            },
        });
    }
    console.log(`  Ilustrações: ${data.ilustracoes.length}`);

    // Import extras
    for (const e of data.extras) {
        await prisma.elementoExtra.upsert({
            where: { id: e.id },
            update: {},
            create: {
                id: e.id,
                nome: e.nome,
                descricao: e.descricao || "",
                foto: e.foto || null,
                createdAt: new Date(e.createdAt),
            },
        });
    }
    console.log(`  Extras: ${data.extras.length}`);

    // Import config
    if (data.config) {
        await prisma.config.upsert({
            where: { id: "singleton" },
            update: {
                prdFotos: data.config.prdFotos,
                prdIlustracoes: data.config.prdIlustracoes,
                appName: data.config.appName,
                appUrl: data.config.appUrl,
            },
            create: {
                id: "singleton",
                prdFotos: data.config.prdFotos || "",
                prdIlustracoes: data.config.prdIlustracoes || "",
                appName: data.config.appName || "Big Brother Malú",
                appUrl: data.config.appUrl || "",
            },
        });
        console.log("  Config: yes");
    }

    console.log("\n✅ Import complete!");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
