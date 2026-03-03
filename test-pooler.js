const { PrismaClient } = require("@prisma/client");

const ref = "ijaagkjymlidmbbaucig";
const pw = "123deOliveira4%24";

async function test(label, url) {
    const p = new PrismaClient({ datasources: { db: { url } } });
    try {
        const c = await p.participante.count();
        console.log(`✅ ${label}: count=${c}`);
    } catch (e) {
        console.log(`❌ ${label}: ${e.message.split("\n").pop()}`);
    } finally {
        await p.$disconnect();
    }
}

(async () => {
    await test("direct", `postgresql://postgres:${pw}@db.${ref}.supabase.co:5432/postgres`);
    await test("pooler-sa-east-1", `postgresql://postgres.${ref}:${pw}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`);
    await test("pooler-us-east-1", `postgresql://postgres.${ref}:${pw}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`);
    await test("pooler-us-east-2", `postgresql://postgres.${ref}:${pw}@aws-0-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true`);
})();
