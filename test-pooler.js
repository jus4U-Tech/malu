const { createClient } = require("@supabase/supabase-js");
const s = createClient(
    "https://ijaagkjymlidmbbaucig.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqYWFna2p5bWxpZG1iYmF1Y2lnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0OTk1OTQsImV4cCI6MjA4ODA3NTU5NH0.HA5Lw6xWe5sIKYe0j4pJ0KIWlAoTMjv_hYAqh2BVd2k"
);

(async () => {
    // Get column names from participantes
    const { data, error } = await s.from("participantes").select("*").limit(1);
    if (error) { console.error("Error:", error); return; }
    console.log("participantes columns:", Object.keys(data[0] || {}));

    const { data: f, error: fe } = await s.from("fotos").select("*").limit(1);
    if (fe) { console.error("fotos Error:", fe); return; }
    console.log("fotos columns:", Object.keys(f[0] || {}));

    const { data: c, error: ce } = await s.from("config").select("*").limit(1);
    if (ce) { console.error("config Error:", ce); return; }
    console.log("config columns:", Object.keys(c[0] || {}));

    const { data: e, error: ee } = await s.from("elementos_extras").select("*").limit(1);
    if (ee) { console.error("extras Error:", ee); return; }
    console.log("extras columns:", Object.keys(e[0] || {}));
})();
