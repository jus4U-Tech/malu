const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:123deOliveira4%24@db.apdqyptykwzyaothkchb.supabase.co:5432/postgres?sslmode=require",
        },
    },
});
p.participante
    .count()
    .then((c) => console.log("count:", c))
    .catch((e) => console.error("ERR:", e.message))
    .finally(() => p.$disconnect());
