// Export all data from local Docker PostgreSQL to JSON
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
    datasources: {
        db: { url: "postgresql://postgres:postgres@localhost:5432/bbb_malu" },
    },
});

async function main() {
    const [participantes, fotos, ilustracoes, extras, config] =
        await Promise.all([
            prisma.participante.findMany({ orderBy: { nome: "asc" } }),
            prisma.foto.findMany({ orderBy: { ordem: "asc" } }),
            prisma.ilustracao.findMany(),
            prisma.elementoExtra.findMany(),
            prisma.config.findUnique({ where: { id: "singleton" } }),
        ]);

    const data = { participantes, fotos, ilustracoes, extras, config };

    require("fs").writeFileSync(
        "C:/tmp/bbb-malu-export.json",
        JSON.stringify(data, null, 2)
    );

    console.log("Exported:");
    console.log("  Participantes:", participantes.length);
    console.log("  Fotos:", fotos.length);
    console.log("  Ilustrações:", ilustracoes.length);
    console.log("  Extras:", extras.length);
    console.log("  Config:", config ? "yes" : "no");
    console.log("Saved to C:/tmp/bbb-malu-export.json");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
