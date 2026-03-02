"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import EmbeddedCountdown from "./src/app/embedded-countdown";

// ── Senha hash SHA-256 de "Tumilowu2$" ────────────────────────────────────────
const SENHA_HASH = "5f0c166260a6b327c834f3943dcbb8a1ef52f177bf9dc403769b7e87b9521f29";

// ── Paleta Rosa Bebê ───────────────────────────────────────────────────────────
const C = {
    bg: "#0c0508",
    surface: "#18090f",
    card: "#1e0d15",
    border: "rgba(220,120,160,0.13)",
    borderHi: "rgba(220,120,160,0.35)",
    pink: "#D4567A",
    pinkLt: "#F0A0BE",
    pinkDim: "rgba(212,86,122,0.18)",
    gold: "#E8C070",
    text: "#F4E6EE",
    textMut: "rgba(244,230,238,0.45)",
    textDim: "rgba(244,230,238,0.22)",
    green: "#5A9070",
    orange: "#B87848",
    red: "#9A4258",
    gray: "#4A4060",
    overlay: "rgba(8,3,6,0.95)",
};

// ── Estilos de Ilustração IA ────────────────────────────────────────────────
const IA_STYLES = [
    { id: "pixar", icon: "🎬", nome: "Pixar 3D", breve: "3D estilizado com renderização cinematográfica", caract: "Proporções expressivas mas renderização foto-realista de texturas, iluminação cinematográfica, cores ricas, subsurface scattering.", prompt: "pixar style 3D render, stylized proportions, hyper-expressive character, detailed textures, soft shading, subsurface scattering, cinematic lighting, high quality render" },
    { id: "digital", icon: "🖌️", nome: "Ilustração Digital", breve: "Limpo, vibrante e nativo digital", caract: "Traços limpos, cores vivas/saturadas, degradês suaves, composições contemporâneas. Foco vetorial e renderização limpa.", prompt: "digital illustration, clean lines, vibrant colors, vector art style, gradient shading, smooth rendering, modern composition" },
    { id: "realismo", icon: "📷", nome: "Realismo", breve: "Precisão fotográfica hiper-realista", caract: "Extremo detalhe, texturas hiper-realistas (pele, tecido), iluminação naturalista, proporções anatômicas exatas.", prompt: "photorealistic, hyperrealistic, intricate details, natural lighting, highly textured, anatomical correctness, octane render, 8k" },
    { id: "manga", icon: "⛩️", nome: "Mangá / Anime", breve: "Visual icônico das HQs japonesas", caract: "Olhos grandes e expressivos, cabelos estilizados, traços dinâmicos, ação exagerada. Foco na narrativa e emoção.", prompt: "anime style, manga style, expressive face, stylized hair, cel shading, dynamic poses, emotional intensity, Japanese comic book art" },
    { id: "cartoon", icon: "😄", nome: "Cartoon", breve: "Divertido, simplificado e exagerado", caract: "Formas arredondadas, proporções distorcidas, cores sólidas, traços grossos. Ideal para mascotes e humor.", prompt: "cartoon style, playful character design, rounded shapes, bold outlines, flat colors, friendly appearance, simple shading, funny" },
    { id: "aquarela", icon: "🎨", nome: "Aquarela", breve: "Técnica translúcida de tinta no papel", caract: "Efeitos translúcidos, transições suaves, bordas indefinidas, manchas. Leveza e arte manual.", prompt: "watercolor style, translucent colors, soft edges, watercolor wash, paint splatter effect, light and airy, traditional art feel, on textured paper" },
    { id: "retro", icon: "📻", nome: "Retrô / Vintage", breve: "Estética de décadas passadas (50s-90s)", caract: "Paletas limitadas, texturas de ruído/grão, traços imperfeitos, aparência de impresso antigo.", prompt: "retro style, vintage illustration, muted color palette, grain texture, halftone dots, nostalgic feel, old print aesthetic" },
    { id: "flat", icon: "🔲", nome: "Flat Design", breve: "Minimalista sem ilusão de profundidade", caract: "Sem sombras complexas, formas geométricas simples, cores sólidas, layout funcional.", prompt: "flat design, minimalist, geometric shapes, solid colors, clean layout, no depth, UI element design style, simplified graphics" },
    { id: "lowpoly", icon: "💎", nome: "Low Poly", breve: "Geométrico, poucos polígonos", caract: "Visual facetado, superfícies angulares, minimalista. Lembra gráficos de videogames digitais.", prompt: "low poly, 3D render, polygonal style, geometric, faceted surface, low resolution aesthetic, video game graphics style, stylized 3D" },
    { id: "sketch", icon: "✏️", nome: "Sketch / Rascunho", breve: "Desenho solto e não finalizado", caract: "Traços soltos, rápidos e sobrepostos. Linhas de construção, anotações e imperfeições. Espontaneidade.", prompt: "sketch style, loose lines, construction lines, pencil drawing, ink sketch, raw energy, hand-drawn look, unfinished concept art" },
];

// ── Status por data ────────────────────────────────────────────────────────────
// Aceita DD/MM/AAAA (novo) ou MM/AA (legado)
function parseDate(palpite) {
    if (!palpite) return null;
    const parts = palpite.split("/");
    let d;
    if (parts.length === 3) {
        // DD/MM/AAAA
        const [dd, mm, yyyy] = parts;
        d = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));
    } else if (parts.length === 2) {
        // MM/AA (legado)
        const [mm, yy] = parts;
        const y = 2000 + parseInt(yy, 10);
        const m = parseInt(mm, 10) - 1;
        if (isNaN(m) || isNaN(y)) return null;
        d = new Date(y, m, 1);
    } else {
        return null;
    }
    if (!d || isNaN(d.getTime())) return null;
    // Auto-corrigir ano: se a data ficou mais de 6 meses no passado,
    // provavelmente o ano está errado — ajustar para o ano corrente
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (d < sixMonthsAgo) {
        d.setFullYear(now.getFullYear());
        // Se ainda ficou no passado (ex: mês já passou este ano), manter — é válido
    }
    return d;
}
// Exibe apenas DD/MM independente do formato salvo
function fmtPalpite(palpite) {
    if (!palpite) return "";
    const parts = palpite.split("/");
    if (parts.length === 3) return `${parts[0]}/${parts[1]}`; // DD/MM/AAAA → DD/MM
    if (parts.length === 2) return palpite;                    // MM/AA legado
    return palpite;
}
function calcStatus(palpite) {
    const d = parseDate(palpite);
    if (!d) return "Sem Palpite";
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const amanha = new Date(now); amanha.setDate(now.getDate() + 1);
    if (d < now) return "Eliminado";
    if (d < amanha) return "No Paredão"; // só no dia exato
    return "Na Casa";
}
const STATUS_CFG = {
    "Na Casa": { icon: "🏠", color: "#5A9070", bg: "rgba(90,144,112,0.12)" },
    "No Paredão": { icon: "🔥", color: "#B87848", bg: "rgba(184,120,72,0.12)" },
    "Eliminado": { icon: "💫", color: "#9A4258", bg: "rgba(154,66,88,0.12)" },
    "Sem Palpite": { icon: "❓", color: "#4A4060", bg: "rgba(74,64,96,0.12)" },
};
const FILTER_IMG = {
    "Todos": "/botoes/todos.png",
    "Na Casa": "/botoes/no_jogo.png",
    "No Paredão": "/botoes/paredao.png",
    "Eliminado": "/botoes/eliminados.png",
    "Extras": "/botoes/extras.png",
    "Ilustrações": "/botoes/galeria.png",
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function maskDate(v) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}
const SK = { part: "bbb_part", cfg: "bbb_cfg", adm: "bbb_adm", extras: "bbb_extras" };
function sto(key, fb) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } }
function stoSave(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch { } }

// ── Clipboard helper (iOS Safari compatible) ──────────────────────────────────
async function copyImageToClipboard(url, toastFn) {
    // iOS Safari exige que a Promise seja passada direto no ClipboardItem
    // (sem await intermediário, senão perde user activation)
    if (navigator.clipboard?.write) {
        try {
            const item = new ClipboardItem({
                "image/png": fetch(url)
                    .then(r => r.blob())
                    .then(b => b.type === "image/png" ? b : new Blob([b], { type: "image/png" })),
            });
            await navigator.clipboard.write([item]);
            toastFn("Imagem copiada! Cole no WhatsApp 📋", true);
            return;
        } catch { /* fallback abaixo */ }
    }
    // Fallback: download da imagem (funciona em qualquer browser)
    try {
        const a = document.createElement("a");
        a.href = url; a.download = "ilustracao.png";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toastFn("Imagem baixada! Compartilhe pelo app 📤", true);
    } catch {
        toastFn("Não foi possível copiar ou baixar", false);
    }
}

// ── Defaults ───────────────────────────────────────────────────────────────────
const CFG0 = { prdFotos: "", prdIlustracoes: "", appName: "Big Brother Malú", appUrl: "" };
const ADM0 = {
    env: "development",
    pgHost: "localhost", pgPort: "5432", pgDb: "bbb_malu",
    pgUser: "postgres", pgPassword: "postgres",
    supaUrl: "", supaAnon: "", supaService: "",
    vercelToken: "", vercelProject: "", vercelOrg: "",
    githubRepo: "", geminiKey: "",
};

// ── Toast ──────────────────────────────────────────────────────────────────────
function useToast() {
    const [toast, setToast] = useState(null);
    const show = useCallback((msg, ok = true) => {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 2800);
    }, []);
    return { toast, show };
}

// ── Estilos base ───────────────────────────────────────────────────────────────
const inputSt = {
    width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
    borderRadius: 12, color: C.text, padding: "13px 14px", fontSize: 16,
    outline: "none", boxSizing: "border-box", marginBottom: 12,
    WebkitAppearance: "none", appearance: "none",
};
const labelSt = {
    display: "block", fontSize: 11, fontWeight: 700, color: C.pinkLt,
    letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6,
};

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
    return (
        <div style={{
            position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(8,3,6,0.72)", backdropFilter: "blur(6px)", zIndex: 9999
        }}>
            <style>{`@keyframes bbb-spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{
                width: 52, height: 52, borderRadius: "50%",
                border: `4px solid ${C.border}`,
                borderTopColor: C.pinkLt,
                animation: "bbb-spin 0.75s linear infinite"
            }} />
        </div>
    );
}

function Btn({ onClick, children, color = C.pink, textColor = "#fff", style = {}, disabled = false, full = false }) {
    return (
        <button onClick={onClick} disabled={disabled} style={{
            background: color, color: textColor, border: "none", borderRadius: 14,
            padding: "14px 20px", cursor: disabled ? "not-allowed" : "pointer",
            fontWeight: 700, fontSize: 15, opacity: disabled ? 0.5 : 1,
            width: full ? "100%" : undefined,
            WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
            transition: "opacity .15s, filter .15s",
            ...style,
        }}>{children}</button>
    );
}

// ── FlipClock — replaced by EmbeddedCountdown from src/app/embedded-countdown.tsx ──
const FlipClock = EmbeddedCountdown;

// ──────────────────────────────────────────────────────────────────────────────
//  APP
// ──────────────────────────────────────────────────────────────────────────────
export default function App() {
    const { toast, show: showToast } = useToast();

    const [parts, setParts] = useState([]);
    const [cfg, setCfg] = useState(CFG0);
    const [adm, setAdm] = useState(ADM0);
    const [appReady, setAppReady] = useState(false);

    const [isAdmin, setIsAdmin] = useState(false);
    const [showPwd, setShowPwd] = useState(false);
    const [pwdIn, setPwdIn] = useState("");
    const [pwdErr, setPwdErr] = useState(false);

    const [showPanel, setShowPanel] = useState(false);
    const [panelPage, setPanelPage] = useState(0);
    const [admDraft, setAdmDraft] = useState(ADM0);
    const [cfgDraft, setCfgDraft] = useState(CFG0);

    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({ nome: "", palpite: "" });

    const [openLoading, setOpenLoading] = useState(false);
    const withLoading = (fn) => {
        setOpenLoading(true);
        setTimeout(() => { setOpenLoading(false); fn(); }, 280);
    };

    const [filter, setFilter] = useState("Todos");
    const [ordem, setOrdem] = useState("nome");
    const [search, setSearch] = useState("");

    const [showImport, setShowImport] = useState(false);
    const [importTxt, setImportTxt] = useState("");
    const [importLoad, setImportLoad] = useState(false);
    const [importRes, setImportRes] = useState(null);

    const [delId, setDelId] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null); // { pid, url, originalUrl }
    const [sliderPos, setSliderPos] = useState(50);
    const sliderRef = useRef(null);

    // ── Elementos Extras ────────────────────────────────────────────────────────
    const [extras, setExtras] = useState([]);
    const [showExtraForm, setShowExtraForm] = useState(false);
    const [editExtraId, setEditExtraId] = useState(null);
    const [extraForm, setExtraForm] = useState({ nome: "", descricao: "", foto: "" });

    // ── IA Illustration Creator ──────────────────────────────────────────────────
    const [meId, setMeId] = useState(() => {
        if (typeof document !== "undefined") {
            const m = document.cookie.match(/bbb_me=([^;]+)/);
            return m ? m[1] : null;
        }
        return null;
    });
    const [showIdentity, setShowIdentity] = useState(false);
    const [identityConfirm, setIdentityConfirm] = useState(null); // participante selecionado para confirmar
    const [showIaModal, setShowIaModal] = useState(false);
    const [iaPrompt, setIaPrompt] = useState("");
    const [iaSelParts, setIaSelParts] = useState([]); // max 4
    const [iaSelExtras, setIaSelExtras] = useState([]); // max 2
    const [iaGenerating, setIaGenerating] = useState(false);
    const [iaPreview, setIaPreview] = useState(null); // { url, participantes, extras, debug }
    const [iaSaving, setIaSaving] = useState(false);
    const [iaStyle, setIaStyle] = useState("pixar");
    const [galeria, setGaleria] = useState([]);
    const [galeriaLoaded, setGaleriaLoaded] = useState(false);
    const [galeriaView, setGaleriaView] = useState(null); // ilustração selecionada para fullscreen

    const saveMeId = (id) => {
        document.cookie = `bbb_me=${id};path=/;max-age=${365 * 24 * 3600}`;
        setMeId(id);
    };

    const openIa = () => {
        if (!meId) { setShowIdentity(true); return; }
        setIaPrompt("");
        setIaSelParts([]);
        setIaSelExtras([]);
        setIaPreview(null);
        setShowIaModal(true);
    };

    const toggleIaPart = (id) => {
        setIaSelParts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleIaExtra = (id) => {
        setIaSelExtras(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const gerarIlustracao = async () => {
        if (!iaPrompt.trim()) return;
        setIaGenerating(true);
        const MAX_RETRIES = 3;
        let lastError = "";
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const res = await fetch("/api/gerar-ilustracao", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: iaPrompt,
                        participanteIds: iaSelParts,
                        extraIds: iaSelExtras,
                        stylePrompt: IA_STYLES.find(s => s.id === iaStyle)?.prompt || "",
                    }),
                });
                const data = await res.json();
                if (data.url) {
                    setIaPreview({ url: data.url, participantes: data.participantes || [], extras: data.extras || [], debug: data.debug || null });
                    setShowIaModal(false);
                    setIaGenerating(false);
                    return;
                }
                lastError = data.error || "Erro ao gerar imagem";
            } catch (e) {
                lastError = "Erro de conexão";
            }
            // Se não é a última tentativa, esperar um pouco antes de tentar novamente
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, 1500));
            }
        }
        showToast(`${lastError} (após ${MAX_RETRIES} tentativas)`, false);
        setIaGenerating(false);
    };

    const aprovarIlustracao = async () => {
        if (!iaPreview || !meId) return;
        setIaSaving(true);
        try {
            const res = await fetch("/api/ilustracoes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    autorId: meId,
                    prompt: iaPrompt,
                    estilo: IA_STYLES.find(s => s.id === iaStyle)?.nome || iaStyle,
                    url: iaPreview.url,
                    participantes: iaPreview.participantes,
                    extras: iaPreview.extras,
                }),
            });
            if (res.ok) {
                // Copiar imagem para o clipboard (iOS-safe)
                await copyImageToClipboard(iaPreview.url, () => { });
                showToast("Ilustração salva! Cole no WhatsApp 📋", true);
                setIaPreview(null);
                fetchGaleria(); // refresh gallery
            } else {
                const d = await res.json();
                showToast(d.error || "Erro ao salvar", false);
            }
        } catch {
            showToast("Erro de conexão", false);
        } finally {
            setIaSaving(false);
        }
    };

    const fetchGaleria = async () => {
        try {
            const res = await fetch("/api/ilustracoes");
            if (res.ok) {
                const data = await res.json();
                setGaleria(data);
            }
        } catch { /* silencioso */ }
        setGaleriaLoaded(true);
    };

    // Carrega galeria na inicialização (para mostrar contador correto)
    useEffect(() => {
        if (!galeriaLoaded) {
            fetchGaleria();
        }
    }, []);

    // Mostra modal de identidade no primeiro acesso
    useEffect(() => {
        if (appReady && !meId && parts.length > 0) {
            setShowIdentity(true);
        }
    }, [appReady, meId, parts.length]);

    // Carrega dados da API (PostgreSQL) com fallback para localStorage
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch("/api/sync");
                if (!res.ok) throw new Error("API error");
                const data = await res.json();
                if (cancelled) return;
                setParts(data.parts || []);
                setCfg(data.cfg || CFG0);
                setExtras(data.extras || []);
                stoSave(SK.part, data.parts || []);
                stoSave(SK.cfg, data.cfg || CFG0);
                stoSave(SK.extras, data.extras || []);
                if ((data.parts || []).some(x => calcStatus(x.palpite) === "No Paredão")) {
                    setFilter("No Paredão");
                }
            } catch {
                const p = sto(SK.part, []);
                const c = sto(SK.cfg, CFG0);
                setParts(p);
                setCfg(c);
                setExtras(sto(SK.extras, []));
                if (p.some(x => calcStatus(x.palpite) === "No Paredão")) {
                    setFilter("No Paredão");
                }
            } finally {
                if (!cancelled) setAppReady(true);
            }
        })();
        setAdm(sto(SK.adm, ADM0));
        return () => { cancelled = true; };
    }, []);

    // Lista filtrada e ordenada
    const lista = parts
        .filter(p => {
            const s = calcStatus(p.palpite);
            return (filter === "Todos" || s === filter) &&
                (!search || p.nome.toLowerCase().includes(search.toLowerCase()));
        })
        .sort((a, b) => {
            if (ordem === "nome") return a.nome.localeCompare(b.nome);
            const da = parseDate(a.palpite), db = parseDate(b.palpite);
            if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
            return da - db;
        });

    const counts = { "Na Casa": 0, "No Paredão": 0, "Eliminado": 0 };
    parts.forEach(p => { const s = calcStatus(p.palpite); if (counts[s] !== undefined) counts[s]++; });

    // ── Auth ────────────────────────────────────────────────────────────────────
    const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";
    const openAdmin = () => {
        if (isDev) {
            withLoading(() => {
                setIsAdmin(true); setAdmDraft({ ...adm }); setCfgDraft({ ...cfg }); setPanelPage(0); setShowPanel(true);
            });
        } else {
            withLoading(() => { setPwdIn(""); setPwdErr(false); setShowPwd(true); });
        }
    };
    const checkPwd = async () => {
        const enterAdmin = () => {
            setIsAdmin(true); setShowPwd(false); setPwdIn(""); setPwdErr(false);
            setAdmDraft({ ...adm }); setCfgDraft({ ...cfg }); setPanelPage(0); setShowPanel(true);
        };
        try {
            if (window.crypto?.subtle) {
                // Contexto seguro (localhost / HTTPS): usa SHA-256
                const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pwdIn));
                const hex = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
                if (hex === SENHA_HASH) enterAdmin();
                else { setPwdErr(true); setPwdIn(""); }
            } else {
                // Fallback HTTP (IP local): compara btoa — suficiente para app de amigos
                const SENHA_B64 = "VHVtaWxvd3UyJA=="; // btoa("Tumilowu2$")
                if (btoa(unescape(encodeURIComponent(pwdIn))) === SENHA_B64) enterAdmin();
                else { setPwdErr(true); setPwdIn(""); }
            }
        } catch { setPwdErr(true); }
    };

    const savePanel = async () => {
        setCfg(cfgDraft); stoSave(SK.cfg, cfgDraft);
        setAdm(admDraft); stoSave(SK.adm, admDraft);
        // Salvar config no banco
        try {
            await fetch("/api/config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cfgDraft),
            });
        } catch { /* fallback já salvo em localStorage */ }
        setShowPanel(false); showToast("Configurações salvas ✓");
    };
    const pages = [
        { key: "partic", label: "Participantes", icon: "👥" },
        { key: "extras", label: "Extras", icon: "🎭" },
        { key: "fotos", label: "Fotos IA", icon: "📷" },
        { key: "ilustra", label: "Ilustrações IA", icon: "✨" },
        { key: "deploy", label: "Deploy", icon: "🚀" },
        { key: "banco", label: "Banco", icon: "🐘" },
        { key: "app", label: "App", icon: "⚙️" },
    ];

    // ── Formulário ──────────────────────────────────────────────────────────────
    const openNew = () => withLoading(() => { setForm({ nome: "", palpite: "" }); setEditId(null); setShowForm(true); });
    const openEdit = (p) => withLoading(() => { setForm({ nome: p.nome, palpite: p.palpite || "" }); setEditId(p.id); setShowForm(true); });
    const closeForm = () => { setShowForm(false); setEditId(null); };
    const saveForm = async () => {
        if (!form.nome.trim()) return showToast("Nome obrigatório", false);
        try {
            if (editId !== null) {
                const res = await fetch(`/api/participantes/${editId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
                const updated = await res.json();
                const normalized = { id: updated.id, nome: updated.nome, palpite: updated.palpite || "", fotos: (updated.fotos || []).map(f => f.url || f) };
                setParts(prev => { const n = prev.map(p => p.id === editId ? normalized : p); stoSave(SK.part, n); return n; });
                showToast("Atualizado ✓");
            } else {
                const res = await fetch("/api/participantes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nome: form.nome.trim(), palpite: form.palpite || null }),
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
                const created = await res.json();
                const normalized = { id: created.id, nome: created.nome, palpite: created.palpite || "", fotos: [] };
                setParts(prev => { const n = [...prev, normalized]; stoSave(SK.part, n); return n; });
                showToast("Adicionado ✓");
            }
        } catch (e) {
            showToast("Erro: " + (e.message || "falha"), false);
            return;
        }
        closeForm();
    };

    // ── Delete ──────────────────────────────────────────────────────────────────
    const confirmDel = async () => {
        try {
            await fetch(`/api/participantes/${delId}`, { method: "DELETE" });
        } catch { /* continua mesmo assim */ }
        setParts(prev => { const n = prev.filter(p => p.id !== delId); stoSave(SK.part, n); return n; });
        setDelId(null); showToast("Removido");
    };

    // ── Import IA via /api/import ───────────────────────────────────────────────
    const processImport = async () => {
        if (!importTxt.trim()) return;
        setImportLoad(true);
        try {
            const res = await fetch("/api/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ texto: importTxt, geminiKey: adm.geminiKey }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro na API");
            const all = (data.participantes || []).map((x, i) => ({
                id: Date.now() + i,
                nome: (x.nome || "").trim(),
                palpite: (x.palpite || "").trim(),
                checked: true,
            })).filter(x => x.nome.length > 0);
            // Filtrar participantes já cadastrados
            const existingNames = new Set(parts.map(p => p.nome.toLowerCase().trim()));
            const result = all.filter(x => !existingNames.has(x.nome.toLowerCase().trim()));
            const removidos = all.length - result.length;
            if (removidos > 0) {
                showToast(`${removidos} já cadastrado(s), removido(s) da lista`, true);
            }
            setImportRes(result);
        } catch (e) {
            showToast("Erro: " + (e.message || "falha"), false);
        } finally {
            setImportLoad(false);
        }
    };

    const closeImport = () => { setShowImport(false); setImportTxt(""); setImportRes(null); };

    const saveImport = async () => {
        const sel = importRes.filter(x => x.checked);
        if (!sel.length) return showToast("Nenhum selecionado", false);
        const news = [];
        for (const x of sel) {
            try {
                const res = await fetch("/api/participantes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ nome: x.nome, palpite: x.palpite || null }),
                });
                if (res.ok) {
                    const created = await res.json();
                    news.push({ id: created.id, nome: created.nome, palpite: created.palpite || "", fotos: [] });
                }
            } catch { /* skip */ }
        }
        setParts(prev => { const n = [...prev, ...news]; stoSave(SK.part, n); return n; });
        showToast(`${news.length} adicionado(s) ✓`);
        closeImport();
    };

    // ── Fotos ───────────────────────────────────────────────────────────────────
    const addFoto = async (pid, dataUrl) => {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) return;
        const [, mimeType, imageBase64] = match;
        const prdPrompt = cfg.prdFotos?.trim();
        const originalUrl = dataUrl;
        if (prdPrompt) {
            showToast("⏳ Processando foto com IA...");
            try {
                const res = await fetch("/api/foto", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ imageBase64, mimeType, prdPrompt, geminiKey: adm.geminiKey }),
                });
                const data = await res.json();
                if (data.processed && data.imageBase64) {
                    const processedUrl = `data:${data.mimeType || mimeType};base64,${data.imageBase64}`;
                    setSliderPos(50);
                    setFotoPreview({ pid, url: processedUrl, originalUrl });
                    showToast("✨ Foto processada com IA!");
                    return;
                }
            } catch (err) { console.error("Foto IA error:", err); }
        }
        // Sem PRD ou sem processamento: preview apenas da original
        setSliderPos(50);
        setFotoPreview({ pid, url: originalUrl, originalUrl: null });
    };
    const confirmFoto = async () => {
        if (!fotoPreview) return;
        const { pid, url } = fotoPreview;
        try {
            const res = await fetch(`/api/participantes/${pid}/fotos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url, original: true }),
            });
            if (!res.ok) throw new Error("Erro ao salvar foto");
            setParts(prev => {
                const n = prev.map(p => p.id === pid ? { ...p, fotos: [...(p.fotos || []), url] } : p);
                stoSave(SK.part, n); return n;
            });
            showToast("Foto salva ✓");
        } catch (e) {
            showToast("Erro ao salvar foto: " + (e.message || "falha"), false);
        }
        setFotoPreview(null);
    };
    const rmFoto = async (pid, idx) => {
        try {
            await fetch(`/api/participantes/${pid}/fotos?idx=${idx}`, { method: "DELETE" });
        } catch { /* best-effort */ }
        setParts(prev => { const n = prev.map(p => p.id === pid ? { ...p, fotos: (p.fotos || []).filter((_, i) => i !== idx) } : p); stoSave(SK.part, n); return n; });
    };

    // ── Elementos Extras CRUD ──────────────────────────────────────────────────
    const openNewExtra = () => withLoading(() => {
        setExtraForm({ nome: "", descricao: "", foto: "" });
        setEditExtraId(null);
        setShowExtraForm(true);
    });
    const openEditExtra = (el) => withLoading(() => {
        setExtraForm({ nome: el.nome, descricao: el.descricao || "", foto: el.foto || "" });
        setEditExtraId(el.id);
        setShowExtraForm(true);
    });
    const saveExtra = async () => {
        if (!extraForm.nome.trim()) return showToast("Nome obrigatório", false);
        try {
            if (editExtraId !== null) {
                const res = await fetch(`/api/extras/${editExtraId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(extraForm),
                });
                if (!res.ok) throw new Error("Erro ao atualizar");
                const updated = await res.json();
                setExtras(prev => { const n = prev.map(e => e.id === editExtraId ? { id: updated.id, nome: updated.nome, descricao: updated.descricao || "", foto: updated.foto || "" } : e); stoSave(SK.extras, n); return n; });
                showToast("Elemento atualizado ✓");
            } else {
                const res = await fetch("/api/extras", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(extraForm),
                });
                if (!res.ok) throw new Error("Erro ao criar");
                const created = await res.json();
                const ne = { id: created.id, nome: created.nome, descricao: created.descricao || "", foto: created.foto || "" };
                setExtras(prev => { const n = [...prev, ne]; stoSave(SK.extras, n); return n; });
                showToast("Elemento adicionado ✓");
            }
        } catch (e) {
            showToast("Erro: " + (e.message || "falha"), false);
            return;
        }
        setShowExtraForm(false); setEditExtraId(null);
    };
    const removeExtra = async (id) => {
        try {
            await fetch(`/api/extras/${id}`, { method: "DELETE" });
        } catch { /* continua */ }
        setExtras(prev => { const n = prev.filter(e => e.id !== id); stoSave(SK.extras, n); return n; });
        showToast("Elemento removido");
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Tela de loading — montamos tudo antes de mostrar
    if (!appReady) {
        return (
            <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
                <div style={{ width: 48, height: 48, border: `3px solid ${C.border}`, borderTopColor: C.pinkLt, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ color: C.textMut, fontSize: 14, fontWeight: 500 }}>Carregando...</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", WebkitFontSmoothing: "antialiased" }}>

            {/* Spinner global — exibido ao abrir qualquer modal */}
            {openLoading && <Spinner />}

            {/* ── CSS responsivo ── */}
            <style>{`
        * { box-sizing: border-box; }
        input, textarea, select, button { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(220,120,160,0.3); border-radius: 2px; }

        /* ── Grid ── */
        .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }

        /* ── Stats / Filter bar ── */
        .stats-bar { display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
        .stats-bar::-webkit-scrollbar { display: none; }
        .stats-bar button { min-height: 44px; }
        .stats-bar .filter-img { width: 48px; height: 48px; border-radius: 10px; }
        .stats-bar .filter-count { font-size: 12px; }

        /* ── Search ── */
        .search-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
        .search-input { flex: 1; min-width: 0; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed; inset: 0; height: 100dvh;
          background: rgba(8,3,6,0.95); z-index: 500;
          display: flex; align-items: flex-end; justify-content: center;
          overscroll-behavior: none;
          padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) 0 env(safe-area-inset-left, 0);
        }
        .modal-inner {
          padding: 20px 16px 24px;
          padding-bottom: max(24px, env(safe-area-inset-bottom, 0px));
          border-radius: 20px 20px 0 0;
          max-height: 92dvh;
          width: 100%;
        }

        /* ── Header ── */
        .app-header-row { flex-wrap: wrap; gap: 8px; }
        .clock-wrapper {
          order: 3; width: 100%; justify-content: center !important;
          margin-top: 4px; max-height: 65px; overflow: hidden;
        }

        /* ── Config segmented tabs ── */
        .config-tabs {
          display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch;
          scrollbar-width: none; gap: 4px; padding: 4px;
        }
        .config-tabs::-webkit-scrollbar { display: none; }
        .config-tabs button { flex-shrink: 0; min-width: 64px; }

        /* ── Toast ── */
        .bbb-toast {
          position: fixed; left: 50%; transform: translateX(-50%); z-index: 9999;
          bottom: max(24px, env(safe-area-inset-bottom, 0px));
          padding: 13px 20px; border-radius: 16px; font-size: 14px; font-weight: 600;
          box-shadow: 0 4px 24px rgba(0,0,0,0.5); pointer-events: none;
          max-width: calc(100vw - 32px); text-align: center; line-height: 1.4;
          word-break: break-word;
        }

        /* ── IA Warning ── */
        .ia-warning {
          padding: 10px 14px; border-radius: 10px; margin-bottom: 8px;
          font-size: 12px; font-weight: 600; line-height: 1.5;
          text-align: center;
        }

        /* ─── TABLET (>=600px) ─── */
        @media (min-width: 600px) {
          .card-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 14px; }
          .modal-overlay { align-items: center; padding: 16px; }
          .modal-inner { padding: 24px 22px 32px; border-radius: 20px; max-height: 90dvh; }
          .stats-bar .filter-img { width: 53px; height: 53px; border-radius: 12px; }
          .stats-bar .filter-count { font-size: 13px; }
          .bbb-toast { max-width: 420px; border-radius: 100px; }
          .clock-wrapper { order: 0; width: auto; margin-top: 0; max-height: none; }
        }

        /* ─── DESKTOP (>=768px) ─── */
        @media (min-width: 768px) {
          .card-grid { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
          .modal-inner { padding: 28px 26px 32px; }
          .stats-bar .filter-img { width: 60px; height: 60px; border-radius: 14px; }
          .stats-bar .filter-count { font-size: 14px; }
          .search-input { max-width: 400px; }
        }
      `}</style>

            {/* ── Toast ── */}
            {toast && (
                <div className="bbb-toast" style={{
                    background: toast.ok ? "#2d6e4e" : "#7a2840", color: "#fff",
                }}>
                    {toast.msg}
                </div>
            )}

            {/* ══ HEADER ══ */}
            <header style={{ background: "linear-gradient(160deg,#1a0510 0%,#0c0508 100%)", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 0" }}>
                    <div className="app-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <img src="/malu.png" alt="Malú"
                                style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: `2px solid ${C.borderHi}` }} />
                            <div>
                                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.pinkLt, letterSpacing: -0.5 }}>Big Brother Malú</h1>
                                <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textMut }}>
                                    Bolão · {parts.length} participante{parts.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
                        {/* FlipClock centralizado no espaço disponível */}
                        <div className="clock-wrapper" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
                            <FlipClock />
                        </div>
                        {/* Botões IA + Config */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <button onClick={openIa}
                                style={{
                                    background: C.pinkDim, border: `1px solid ${C.borderHi}`, borderRadius: 14,
                                    padding: "10px 14px", cursor: "pointer", color: C.pinkLt, fontSize: 20,
                                    WebkitTapHighlightColor: "transparent", touchAction: "manipulation", flexShrink: 0,
                                }}>
                                ✨
                            </button>

                            <button onClick={isAdmin ? () => { setAdmDraft({ ...adm }); setCfgDraft({ ...cfg }); setPanelPage(0); setShowPanel(true); } : openAdmin}
                                style={{
                                    background: C.pinkDim, border: `1px solid ${C.borderHi}`, borderRadius: 14,
                                    padding: "10px 14px", cursor: "pointer", color: C.pinkLt, fontSize: 20,
                                    WebkitTapHighlightColor: "transparent", touchAction: "manipulation", flexShrink: 0
                                }}>
                                ⚙️
                            </button>
                        </div>

                    </div>

                    {/* Stats / Filtros */}
                    <div className="stats-bar" style={{ borderTop: `1px solid ${C.border}` }}>
                        {[["Todos", "🎉", parts.length], ...Object.entries(counts).map(([s, n]) => [s, STATUS_CFG[s].icon, n]), ["Extras", "🎭", extras.length], ["Ilustrações", "🖼️", galeria.length]].map(([s, icon, n]) => (
                            <button key={s} onClick={() => setFilter(filter === s ? "Todos" : s)}
                                style={{
                                    flex: 1, background: "none", border: "none", padding: "6px 2px", cursor: "pointer",
                                    borderBottom: filter === s ? `2px solid ${s === "Todos" ? C.pink : STATUS_CFG[s]?.color || "#C89040"}` : "2px solid transparent",
                                    transition: "border-color .15s", WebkitTapHighlightColor: "transparent",
                                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                                }}>
                                {FILTER_IMG[s] ? (
                                    <img src={FILTER_IMG[s]} alt={s}
                                        className="filter-img"
                                        style={{
                                            objectFit: "cover",
                                            opacity: filter === s ? 1 : 0.5, transition: "opacity .15s",
                                            boxSizing: "border-box", display: "block",
                                        }} />
                                ) : (
                                    <div style={{ fontSize: 20 }}>{icon}</div>
                                )}
                                <div className="filter-count" style={{ fontWeight: 700, color: filter === s ? (s === "Todos" ? C.pink : STATUS_CFG[s]?.color || "#C89040") : C.text }}>{n}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* ══ CONTENT ══ */}
            <main style={{ maxWidth: 1100, margin: "0 auto", padding: "16px" }}>

                {/* Busca + Ordem + Ações admin — ocultados no tab Extras */}
                {filter !== "Extras" && filter !== "Ilustrações" && <>
                    <div className="search-row" style={{ marginBottom: 14 }}>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="🔍  Buscar..."
                            className="search-input"
                            style={{ ...inputSt, marginBottom: 0 }}
                        />
                        <div style={{ display: "flex", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                            {[["nome", "🔤"], ["palpite", "📅"]].map(([v, l]) => (
                                <button key={v} onClick={() => setOrdem(v)}
                                    style={{
                                        padding: "12px 14px", border: "none", background: ordem === v ? C.pink : "transparent",
                                        color: ordem === v ? "#fff" : C.textMut, cursor: "pointer", fontWeight: 600, fontSize: 14,
                                        transition: "all .15s", WebkitTapHighlightColor: "transparent"
                                    }}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Botões admin */}
                    {isAdmin && (
                        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                            <Btn onClick={openNew} style={{ flex: 1, fontSize: 14, padding: "12px 0" }}>+ Cadastrar</Btn>
                            <Btn onClick={() => { setShowImport(true); setImportRes(null); setImportTxt(""); }}
                                color={C.surface} textColor={C.pinkLt}
                                style={{ flex: 1, border: `1px solid ${C.borderHi}`, fontSize: 14, padding: "12px 0" }}>
                                🤖 Importar
                            </Btn>
                        </div>
                    )}
                </>}

                {/* Grid de cards — participantes ou extras */}
                {filter === "Ilustrações" ? (
                    /* ══ GALERIA DE ILUSTRAÇÕES ══ */
                    !galeriaLoaded ? (
                        <div style={{ textAlign: "center", padding: "80px 20px", color: C.textDim }}>
                            <div style={{ fontSize: 28 }}>⏳</div>
                            <p style={{ fontSize: 14, margin: "8px 0 0" }}>Carregando galeria...</p>
                        </div>
                    ) : galeria.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "80px 20px", color: C.textDim }}>
                            <div style={{ fontSize: 52, marginBottom: 16 }}>🖼️</div>
                            <p style={{ fontSize: 16, margin: 0 }}>Nenhuma ilustração criada ainda</p>
                            <p style={{ fontSize: 13, margin: "8px 0 0", color: C.textMut }}>Crie sua primeira usando o botão ✨</p>
                        </div>
                    ) : (
                        <div className="card-grid">
                            {galeria.map(il => (
                                <div key={il.id} style={{
                                    background: C.card, borderRadius: 16, overflow: "hidden",
                                    border: `1px solid ${C.border}`, transition: "transform .2s, box-shadow .2s",
                                    cursor: "pointer",
                                }} onClick={() => setGaleriaView(il)}>
                                    <div style={{ aspectRatio: "1/1", background: C.surface, position: "relative", overflow: "hidden" }}>
                                        <img src={il.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                    </div>
                                    <div style={{ padding: "10px 12px" }}>
                                        <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 2 }}>
                                            {il.autor?.nome || "Anônimo"}
                                        </div>
                                        {il.estilo && (
                                            <div style={{ fontSize: 11, color: C.pinkLt, fontWeight: 600, marginBottom: 2 }}>
                                                🎨 {il.estilo}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 11, color: C.textMut, marginBottom: 6 }}>
                                            {new Date(il.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}{" "}
                                            {new Date(il.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                        <button onClick={async (e) => {
                                            e.stopPropagation();
                                            await copyImageToClipboard(il.url, showToast);
                                        }} style={{
                                            width: "100%", padding: "8px 0", border: `1px solid ${C.borderHi}`,
                                            borderRadius: 8, background: C.surface, color: C.pinkLt,
                                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                                            transition: "all .15s",
                                        }}>
                                            📋 Copiar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : filter === "Extras" ? (
                    /* ══ EXTRAS GRID ══ */
                    extras.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "80px 20px", color: C.textDim }}>
                            <div style={{ fontSize: 52, marginBottom: 16 }}>🎭</div>
                            <p style={{ fontSize: 16, margin: 0 }}>
                                {isAdmin ? "Cadastre elementos extras nas configurações" : "Nenhum elemento extra ainda"}
                            </p>
                        </div>
                    ) : (
                        <div className="card-grid">
                            {extras.map(el => (
                                <div key={el.id} style={{
                                    background: C.card, borderRadius: 16, overflow: "hidden",
                                    border: `1px solid ${C.border}`,
                                    transition: "transform .2s, box-shadow .2s"
                                }}>
                                    <div style={{ aspectRatio: "3/4", background: C.surface, position: "relative", overflow: "hidden" }}>
                                        {el.foto ? (
                                            <img src={el.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                        ) : (
                                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60, color: C.textDim }}>🎭</div>
                                        )}
                                    </div>
                                    <div style={{ padding: "12px 14px" }}>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 4 }}>{el.nome}</div>
                                        {el.descricao && (
                                            <p style={{ fontSize: 13, color: C.textMut, margin: 0, lineHeight: 1.4 }}>{el.descricao}</p>
                                        )}
                                        {isAdmin && (
                                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                                <button onClick={() => openEditExtra(el)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: C.pinkLt, cursor: "pointer", fontSize: 12 }}>✏️ Editar</button>
                                                <button onClick={() => removeExtra(el.id)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "6px 12px", color: "#9A4258", cursor: "pointer", fontSize: 12 }}>🗑️ Remover</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    /* ══ PARTICIPANTS GRID ══ */
                    lista.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "80px 20px", color: C.textDim }}>
                            <div style={{ fontSize: 52, marginBottom: 16 }}>🎂</div>
                            <p style={{ fontSize: 16, margin: 0 }}>
                                {parts.length === 0
                                    ? (isAdmin ? "Cadastre ou importe participantes" : "Nenhum participante ainda")
                                    : "Nenhum neste filtro"}
                            </p>
                        </div>
                    ) : (
                        <div className="card-grid">
                            {lista.map(p => (
                                <ParticipantCard key={p.id} p={p} isAdmin={isAdmin}
                                    onEdit={() => openEdit(p)} onDelete={() => setDelId(p.id)}
                                    onAddFoto={url => addFoto(p.id, url)} onRmFoto={idx => rmFoto(p.id, idx)}
                                />
                            ))}
                        </div>
                    )
                )}
            </main>

            {/* ══ MODAL: Senha ══ */}
            {showPwd && (
                <Modal onClose={() => setShowPwd(false)}>
                    <div style={{ textAlign: "center", paddingBottom: 8 }}>
                        <div style={{ fontSize: 44, marginBottom: 8 }}>🔐</div>
                        <h2 style={{ margin: "0 0 4px", color: C.pinkLt, fontSize: 20 }}>Acesso Admin</h2>
                        <p style={{ margin: "0 0 24px", color: C.textMut, fontSize: 14 }}>Digite a senha para continuar</p>
                        <input type="password" value={pwdIn} autoFocus
                            onChange={e => { setPwdIn(e.target.value); setPwdErr(false); }}
                            onKeyDown={e => e.key === "Enter" && checkPwd()}
                            placeholder="Senha"
                            style={{ ...inputSt, textAlign: "center", fontSize: 20, letterSpacing: 5, marginBottom: pwdErr ? 8 : 16 }}
                        />
                        {pwdErr && <p style={{ margin: "0 0 14px", color: C.red, fontSize: 13, fontWeight: 600 }}>Senha incorreta</p>}
                        <div style={{ display: "flex", gap: 10 }}>
                            <Btn onClick={checkPwd} style={{ flex: 1 }}>Entrar</Btn>
                            <Btn onClick={() => setShowPwd(false)} color={C.surface} textColor={C.textMut}
                                style={{ border: `1px solid ${C.border}` }}>Cancelar</Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ══ MODAL: Painel Config ══ */}
            {showPanel && (
                <Modal onClose={() => setShowPanel(false)}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                        <div>
                            <h2 style={{ margin: 0, color: C.pinkLt, fontSize: 18, fontWeight: 700 }}>⚙️ Configurações</h2>
                            <p style={{ margin: "2px 0 0", fontSize: 12, color: C.textMut }}>{panelPage + 1} / {pages.length}</p>
                        </div>
                        <button onClick={() => setShowPanel(false)} style={{ background: "none", border: "none", color: C.textMut, fontSize: 24, cursor: "pointer", padding: 4 }}>✕</button>
                    </div>

                    {/* Segmented control */}
                    <div className="config-tabs" style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, marginBottom: 16 }}>
                        {pages.map((pg, i) => (
                            <button key={pg.key} onClick={() => setPanelPage(i)}
                                style={{
                                    flex: 1, padding: "8px 2px", border: "none", borderRadius: 11, cursor: "pointer",
                                    fontSize: 11, fontWeight: 700, transition: "all .2s", lineHeight: 1.3,
                                    background: panelPage === i ? C.pink : "transparent",
                                    color: panelPage === i ? "#fff" : C.textMut,
                                    WebkitTapHighlightColor: "transparent"
                                }}>
                                <div style={{ fontSize: 17, marginBottom: 2 }}>{pg.icon}</div>
                                <div>{pg.label}</div>
                            </button>
                        ))}
                    </div>

                    {/* Dots */}
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18 }}>
                        {pages.map((_, i) => (
                            <button key={i} onClick={() => setPanelPage(i)}
                                style={{
                                    width: panelPage === i ? 20 : 6, height: 6, borderRadius: 3, border: "none",
                                    cursor: "pointer", transition: "all .25s", padding: 0,
                                    background: panelPage === i ? C.pink : C.border
                                }} />
                        ))}
                    </div>

                    {/* Conteúdo da página */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>

                        {/* Participantes */}
                        {panelPage === 0 && (
                            <div>
                                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                                    <Btn onClick={() => { setShowPanel(false); openNew(); }} style={{ flex: 1, fontSize: 14 }}>➕ Novo</Btn>
                                    <Btn onClick={() => { setShowPanel(false); setShowImport(true); setImportRes(null); setImportTxt(""); }}
                                        color={C.surface} textColor={C.pinkLt}
                                        style={{ flex: 1, border: `1px solid ${C.borderHi}`, fontSize: 14 }}>🤖 Importar</Btn>
                                </div>
                                <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                                    {Object.entries(STATUS_CFG).map(([s, sc]) => (
                                        <div key={s} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
                                            <span style={{ fontSize: 16 }}>{sc.icon}</span>
                                            <span style={{ fontSize: 14, color: sc.color, fontWeight: 600 }}>{s}</span>
                                            <span style={{ fontSize: 13, color: C.textMut, marginLeft: "auto", fontWeight: 700 }}>{counts[s]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Extras */}
                        {panelPage === 1 && (
                            <div>
                                <Btn onClick={() => { setShowPanel(false); openNewExtra(); }} style={{ fontSize: 14, marginBottom: 14 }} full>🎭 Novo Elemento</Btn>
                                {extras.length === 0 ? (
                                    <p style={{ textAlign: "center", fontSize: 14, color: C.textDim, padding: "30px 0" }}>Nenhum elemento extra cadastrado</p>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {extras.map(el => (
                                            <div key={el.id} style={{
                                                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                                                background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
                                            }}>
                                                {el.foto ? (
                                                    <img src={el.foto} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                                                ) : (
                                                    <div style={{ width: 44, height: 44, borderRadius: 8, background: C.border, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎭</div>
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{el.nome}</div>
                                                    {el.descricao && <div style={{ fontSize: 12, color: C.textMut, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{el.descricao}</div>}
                                                </div>
                                                <button onClick={() => { setShowPanel(false); openEditExtra(el); }}
                                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.textMut, padding: 4, WebkitTapHighlightColor: "transparent" }}>✏️</button>
                                                <button onClick={() => removeExtra(el.id)}
                                                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.red, padding: 4, WebkitTapHighlightColor: "transparent" }}>🗑️</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Fotos IA */}
                        {panelPage === 2 && (
                            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                <label style={labelSt}>Instrução para tratamento de fotos</label>
                                <textarea value={cfgDraft.prdFotos}
                                    onChange={e => setCfgDraft(d => ({ ...d, prdFotos: e.target.value }))}
                                    placeholder={"Exemplos:\n• Remova o fundo e coloque fundo branco\n• Aplique filtro vintage\n• Deixe em branco para desativar"}
                                    style={{ ...inputSt, flex: 1, minHeight: 130, resize: "vertical", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}
                                />
                                <div style={{
                                    padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                                    background: cfgDraft.prdFotos.trim() ? "rgba(90,144,112,0.15)" : C.surface,
                                    color: cfgDraft.prdFotos.trim() ? C.green : C.textDim
                                }}>
                                    {cfgDraft.prdFotos.trim() ? "✓ Tratamento ativo" : "○ Desativado"}
                                </div>
                            </div>
                        )}

                        {/* Ilustrações IA */}
                        {panelPage === 3 && (
                            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                                <label style={labelSt}>PRD do sistema para ilustrações</label>
                                <p style={{ margin: "0 0 8px", fontSize: 12, color: C.textMut }}>Esta instrução é combinada com o prompt do participante. Tem prioridade sobre o prompt do participante.</p>
                                <textarea value={cfgDraft.prdIlustracoes || ""}
                                    onChange={e => setCfgDraft(d => ({ ...d, prdIlustracoes: e.target.value }))}
                                    placeholder={"Exemplo:\n• Crie ilustrações no estilo Pixar/Disney\n• Use cores vibrantes e cenário tropical\n• Os personagens devem parecer caricaturas fofas"}
                                    style={{ ...inputSt, flex: 1, minHeight: 130, resize: "vertical", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}
                                />
                                <div style={{
                                    padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                                    background: (cfgDraft.prdIlustracoes || "").trim() ? "rgba(90,144,112,0.15)" : C.surface,
                                    color: (cfgDraft.prdIlustracoes || "").trim() ? C.green : C.textDim
                                }}>
                                    {(cfgDraft.prdIlustracoes || "").trim() ? "✓ PRD de Ilustrações ativo" : "○ Desativado (só o prompt do participante será usado)"}
                                </div>
                            </div>
                        )}

                        {/* Deploy */}
                        {panelPage === 4 && (
                            <div>
                                <div style={{ background: "rgba(212,86,122,0.08)", border: `1px solid ${C.borderHi}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
                                    <label style={{ ...labelSt, color: C.pinkLt }}>🤖 Gemini API Key</label>
                                    <p style={{ margin: "0 0 8px", fontSize: 12, color: C.textMut }}>Necessário para Importar Lista com IA</p>
                                    <input type="password" value={admDraft.geminiKey}
                                        onChange={e => setAdmDraft(d => ({ ...d, geminiKey: e.target.value }))}
                                        placeholder="AIza..." style={{ ...inputSt, marginBottom: 0 }} />
                                </div>
                                {[["vercelToken", "Vercel Token"], ["vercelProject", "Project ID"], ["vercelOrg", "Org ID"], ["githubRepo", "GitHub Repo"]].map(([k, l]) => (
                                    <div key={k}>
                                        <label style={labelSt}>{l}</label>
                                        <input type="password" value={admDraft[k]}
                                            onChange={e => setAdmDraft(d => ({ ...d, [k]: e.target.value }))}
                                            style={{ ...inputSt, marginBottom: 10 }} />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Banco */}
                        {panelPage === 5 && (
                            <div>
                                <div style={{ display: "flex", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 14, overflow: "hidden" }}>
                                    {[["development", "🐳 Local"], ["production", "☁️ Supabase"]].map(([v, l]) => (
                                        <button key={v} onClick={() => setAdmDraft(d => ({ ...d, env: v }))}
                                            style={{
                                                flex: 1, padding: "13px", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14, transition: "all .15s",
                                                background: admDraft.env === v ? C.pink : "transparent", color: admDraft.env === v ? "#fff" : C.textMut,
                                                WebkitTapHighlightColor: "transparent"
                                            }}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                                {admDraft.env === "development" ? (
                                    [["pgHost", "Host", "localhost"], ["pgPort", "Porta", "5432"], ["pgDb", "Database", "bbb_malu"],
                                    ["pgUser", "Usuário", "postgres"], ["pgPassword", "Senha", "postgres"]].map(([k, l, ph]) => (
                                        <div key={k}>
                                            <label style={labelSt}>{l}</label>
                                            <input value={admDraft[k]} onChange={e => setAdmDraft(d => ({ ...d, [k]: e.target.value }))}
                                                placeholder={ph} style={{ ...inputSt, marginBottom: 10 }} />
                                        </div>
                                    ))
                                ) : (
                                    [["supaUrl", "Supabase URL", "https://xxx.supabase.co"],
                                    ["supaAnon", "Anon Key", ""], ["supaService", "Service Role Key", ""]].map(([k, l, ph]) => (
                                        <div key={k}>
                                            <label style={labelSt}>{l}</label>
                                            <input type={k.includes("Key") || k.includes("Serv") ? "password" : "text"}
                                                value={admDraft[k]} onChange={e => setAdmDraft(d => ({ ...d, [k]: e.target.value }))}
                                                placeholder={ph} style={{ ...inputSt, marginBottom: 10 }} />
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* App */}
                        {panelPage === 6 && (
                            <div>
                                {[["appName", "Nome do App"], ["appUrl", "URL Pública"]].map(([k, l]) => (
                                    <div key={k}>
                                        <label style={labelSt}>{l}</label>
                                        <input value={cfgDraft[k] || ""} onChange={e => setCfgDraft(d => ({ ...d, [k]: e.target.value }))}
                                            style={inputSt} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Nav + Salvar */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                        <button onClick={() => setPanelPage(i => Math.max(0, i - 1))} disabled={panelPage === 0}
                            style={{
                                width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface,
                                color: panelPage === 0 ? C.textDim : C.text, cursor: panelPage === 0 ? "default" : "pointer", fontSize: 20,
                                WebkitTapHighlightColor: "transparent"
                            }}>‹</button>
                        <button onClick={() => setPanelPage(i => Math.min(pages.length - 1, i + 1))} disabled={panelPage === pages.length - 1}
                            style={{
                                width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.border}`, background: C.surface,
                                color: panelPage === pages.length - 1 ? C.textDim : C.text, cursor: panelPage === pages.length - 1 ? "default" : "pointer", fontSize: 20,
                                WebkitTapHighlightColor: "transparent"
                            }}>›</button>
                        <Btn onClick={savePanel} style={{ flex: 1 }}>Salvar</Btn>
                    </div>
                </Modal>
            )}

            {/* ══ MODAL: Formulário ══ */}
            {showForm && (
                <Modal onClose={closeForm}>
                    <h2 style={{ margin: "0 0 18px", color: C.pinkLt, fontSize: 18 }}>
                        {editId !== null ? "✏️ Editar" : "➕ Novo"} Participante
                    </h2>
                    <label style={labelSt}>Nome *</label>
                    <input value={form.nome} autoFocus
                        onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                        onKeyDown={e => e.key === "Enter" && saveForm()}
                        placeholder="Nome completo" style={inputSt} />
                    <label style={labelSt}>Data de eliminação (palpite)</label>
                    <input value={form.palpite}
                        onChange={e => {
                            // Máscara DD/MM/AAAA
                            let v = e.target.value.replace(/\D/g, "").slice(0, 8);
                            if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                            if (v.length >= 6) v = v.slice(0, 5) + "/" + v.slice(5);
                            setForm(f => ({ ...f, palpite: v }));
                        }}
                        placeholder="07/03/2025" maxLength={10} inputMode="numeric" style={inputSt} />
                    {form.palpite && (() => {
                        const s = calcStatus(form.palpite); const sc = STATUS_CFG[s];
                        return <div style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10,
                            background: sc.bg, border: `1px solid ${sc.color}44`, marginBottom: 16
                        }}>
                            <span>{sc.icon}</span><span style={{ fontSize: 14, color: sc.color, fontWeight: 700 }}>{s}</span>
                        </div>;
                    })()}

                    {/* Gerenciamento de Fotos (apenas ao editar) */}
                    {editId !== null && (() => {
                        const participant = parts.find(p => p.id === editId);
                        const fotos = participant?.fotos || [];
                        return (
                            <div style={{ marginBottom: 16 }}>
                                <label style={labelSt}>📸 Fotos ({fotos.length})</label>
                                {fotos.length > 0 ? (
                                    <div style={{
                                        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: 8,
                                        marginBottom: 12,
                                    }}>
                                        {fotos.map((url, i) => (
                                            <div key={i} style={{ position: "relative", aspectRatio: "1/1", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
                                                <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                                <button onClick={() => { rmFoto(editId, i); }}
                                                    style={{
                                                        position: "absolute", top: 4, right: 4, width: 24, height: 24,
                                                        borderRadius: "50%", border: "none", cursor: "pointer",
                                                        background: "rgba(154,66,88,0.9)", color: "#fff", fontSize: 12,
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                        WebkitTapHighlightColor: "transparent",
                                                    }}>✕</button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ margin: "0 0 12px", fontSize: 13, color: C.textMut }}>Nenhuma foto adicionada</p>
                                )}
                                <label style={{
                                    display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
                                    borderRadius: 10, border: `1px solid ${C.borderHi}`, background: C.surface,
                                    color: C.pinkLt, fontSize: 13, fontWeight: 600, cursor: "pointer",
                                    WebkitTapHighlightColor: "transparent",
                                }}>
                                    📸 Adicionar foto
                                    <input type="file" accept="image/*" style={{ display: "none" }}
                                        onChange={e => {
                                            const f = e.target.files?.[0]; if (!f) return;
                                            const r = new FileReader();
                                            r.onload = ev => addFoto(editId, ev.target.result);
                                            r.readAsDataURL(f); e.target.value = "";
                                        }} />
                                </label>
                            </div>
                        );
                    })()}

                    <div style={{ display: "flex", gap: 10 }}>
                        <Btn onClick={saveForm} style={{ flex: 1 }}>💾 Salvar</Btn>
                        <Btn onClick={closeForm} color={C.surface} textColor={C.textMut}
                            style={{ border: `1px solid ${C.border}` }}>Cancelar</Btn>
                    </div>
                </Modal>
            )}

            {/* ══ MODAL: Importar ══ */}
            {showImport && (
                <Modal onClose={closeImport}>
                    {/* Modal de import usa layout flex-column para manter header+botões fixos e lista rolável */}
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>

                        {/* Header fixo */}
                        <div style={{ padding: "20px 20px 0", flexShrink: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <h2 style={{ margin: 0, color: C.pinkLt, fontSize: 18 }}>🤖 Importar Lista</h2>
                                <button onClick={closeImport} style={{ background: "none", border: "none", color: C.textMut, fontSize: 24, cursor: "pointer", padding: 4 }}>✕</button>
                            </div>
                            <p style={{ margin: "0 0 14px", fontSize: 13, color: C.textMut }}>
                                Cole a lista em qualquer formato. A IA identifica nomes e palpites.
                            </p>
                        </div>

                        {/* Conteúdo scrollável */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px", minHeight: 0, display: "flex", flexDirection: "column" }}>
                            {!importRes ? (
                                <textarea value={importTxt} onChange={e => setImportTxt(e.target.value)}
                                    disabled={importLoad}
                                    placeholder={"Ana Silva - março/25\nJoão Pedro: 04/25\n1. Maria Fernanda (maio de 2025)"}
                                    style={{ ...inputSt, flex: 1, minHeight: 120, resize: "none", fontFamily: "monospace", fontSize: 13, lineHeight: 1.6 }}
                                />
                            ) : (
                                <>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                        <span style={{ fontSize: 13, color: C.textMut }}>
                                            {importRes.length} participante(s) encontrado(s)
                                        </span>
                                        <button onClick={() => setImportRes(r => r.map(x => ({ ...x, checked: !r.every(y => y.checked) })))}
                                            style={{
                                                background: "none", border: `1px solid ${C.borderHi}`, borderRadius: 8, padding: "5px 12px",
                                                color: C.pinkLt, cursor: "pointer", fontSize: 12, fontWeight: 600
                                            }}>
                                            {importRes.every(x => x.checked) ? "Desmarcar" : "Marcar"} todos
                                        </button>
                                    </div>
                                    <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, marginBottom: 14 }}>
                                        {importRes.map(item => (
                                            <div key={item.id}
                                                onClick={() => setImportRes(r => r.map(x => x.id === item.id ? { ...x, checked: !x.checked } : x))}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                                                    borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                                                    background: item.checked ? "rgba(212,86,122,0.06)" : "transparent"
                                                }}>
                                                <div style={{
                                                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                                                    border: `2px solid ${item.checked ? C.pink : C.border}`,
                                                    background: item.checked ? C.pink : "transparent",
                                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700
                                                }}>
                                                    {item.checked ? "✓" : ""}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: 14, fontWeight: 600, color: C.text,
                                                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                                    }}>{item.nome}</div>
                                                    <div style={{ fontSize: 12, color: C.textDim }}>
                                                        {fmtPalpite(item.palpite) || "sem palpite"}
                                                        {item.palpite && <span style={{ color: STATUS_CFG[calcStatus(item.palpite)]?.color, marginLeft: 8 }}>
                                                            {STATUS_CFG[calcStatus(item.palpite)]?.icon} {calcStatus(item.palpite)}
                                                        </span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Botões fixos no fundo */}
                        <div style={{ padding: "12px 20px 20px", flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
                            {!importRes ? (
                                <div style={{ display: "flex", gap: 10 }}>
                                    <Btn onClick={processImport} disabled={importLoad} style={{ flex: 1 }}>
                                        {importLoad ? "⏳ Processando..." : "✨ Identificar com IA"}
                                    </Btn>
                                    <Btn onClick={closeImport} color={C.surface} textColor={C.textMut}
                                        style={{ border: `1px solid ${C.border}` }}>Cancelar</Btn>
                                </div>
                            ) : (
                                <div style={{ display: "flex", gap: 10 }}>
                                    <Btn onClick={saveImport} style={{ flex: 1 }}>
                                        💾 Salvar {importRes.filter(x => x.checked).length}
                                    </Btn>
                                    <Btn onClick={() => setImportRes(null)} color={C.surface} textColor={C.textMut}
                                        style={{ border: `1px solid ${C.border}` }}>← Voltar</Btn>
                                    <Btn onClick={closeImport} color={C.surface} textColor={C.textMut}
                                        style={{ border: `1px solid ${C.border}` }}>✕</Btn>
                                </div>
                            )}
                        </div>

                    </div>
                </Modal>
            )}

            {/* ══ MODAL: Preview de Foto ══ */}
            {fotoPreview && (
                <Modal onClose={() => setFotoPreview(null)}>
                    <div style={{ padding: "20px 16px 8px", textAlign: "center" }}>
                        <h3 style={{ margin: "0 0 16px", color: C.pinkLt, fontSize: 17 }}>📸 Prévia da foto</h3>

                        {fotoPreview.originalUrl ? (
                            /* ── Slider Antes/Depois ── */
                            <div style={{ marginBottom: 16 }}>
                                {/* Labels */}
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: C.textMut, textTransform: "uppercase", letterSpacing: 0.8 }}>Original</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 0.8 }}>✨ Com IA</span>
                                </div>
                                {/* Container */}
                                <div
                                    ref={sliderRef}
                                    onMouseDown={(e) => {
                                        const rect = sliderRef.current?.getBoundingClientRect();
                                        if (!rect) return;
                                        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                                        setSliderPos((x / rect.width) * 100);
                                        const onMM = (ev) => { const xx = Math.max(0, Math.min(ev.clientX - rect.left, rect.width)); setSliderPos((xx / rect.width) * 100); };
                                        const stop = () => { document.removeEventListener("mousemove", onMM); document.removeEventListener("mouseup", stop); };
                                        document.addEventListener("mousemove", onMM);
                                        document.addEventListener("mouseup", stop);
                                    }}
                                    onTouchStart={(e) => {
                                        const rect = sliderRef.current?.getBoundingClientRect();
                                        if (!rect) return;
                                        const x = Math.max(0, Math.min(e.touches[0].clientX - rect.left, rect.width));
                                        setSliderPos((x / rect.width) * 100);
                                        const onTM = (ev) => { ev.preventDefault(); const xx = Math.max(0, Math.min(ev.touches[0].clientX - rect.left, rect.width)); setSliderPos((xx / rect.width) * 100); };
                                        const stop = () => { document.removeEventListener("touchmove", onTM); document.removeEventListener("touchend", stop); };
                                        document.addEventListener("touchmove", onTM, { passive: false });
                                        document.addEventListener("touchend", stop);
                                    }}
                                    style={{
                                        position: "relative", width: "100%", aspectRatio: "3/4",
                                        borderRadius: 12, overflow: "hidden", cursor: "col-resize",
                                        border: `1px solid ${C.border}`, userSelect: "none", WebkitUserSelect: "none",
                                        touchAction: "none",
                                    }}
                                >
                                    {/* Camada de baixo: Com IA (visível completa) */}
                                    <img src={fotoPreview.url} alt="Processada"
                                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                                        draggable={false} />

                                    {/* Camada de cima: Original (clip pela posição do slider) */}
                                    <div style={{
                                        position: "absolute", inset: 0,
                                        clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                                    }}>
                                        <img src={fotoPreview.originalUrl} alt="Original"
                                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                            draggable={false} />
                                    </div>

                                    {/* Linha divisória */}
                                    <div style={{
                                        position: "absolute", top: 0, bottom: 0,
                                        left: `${sliderPos}%`, transform: "translateX(-50%)",
                                        width: 3, background: "#fff",
                                        boxShadow: "0 0 8px rgba(0,0,0,0.5)",
                                        zIndex: 2,
                                    }} />

                                    {/* Handle circular */}
                                    <div style={{
                                        position: "absolute", top: "50%",
                                        left: `${sliderPos}%`, transform: "translate(-50%, -50%)",
                                        width: 36, height: 36, borderRadius: "50%",
                                        background: "#fff", border: "2px solid rgba(0,0,0,0.2)",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        zIndex: 3, fontSize: 14, color: "#333", fontWeight: 700,
                                        cursor: "col-resize",
                                    }}>
                                        ◀▶
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Apenas a foto original (sem processamento IA) */
                            <div style={{
                                borderRadius: 12, overflow: "hidden", marginBottom: 16,
                                maxHeight: "55dvh", display: "flex", alignItems: "center", justifyContent: "center",
                                background: C.surface
                            }}>
                                <img src={fotoPreview.url} alt=""
                                    style={{ maxWidth: "100%", maxHeight: "55dvh", objectFit: "contain", display: "block" }} />
                            </div>
                        )}

                        <div style={{ display: "flex", gap: 10 }}>
                            <Btn onClick={confirmFoto} style={{ flex: 1 }}>💾 Salvar</Btn>
                            <Btn onClick={() => setFotoPreview(null)} color={C.surface} textColor={C.textMut}
                                style={{ border: `1px solid ${C.border}`, flex: 1 }}>Cancelar</Btn>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ══ MODAL: Elemento Extra ══ */}
            {showExtraForm && (
                <Modal onClose={() => { setShowExtraForm(false); setEditExtraId(null); }}>
                    <h2 style={{ margin: "0 0 18px", color: C.pinkLt, fontSize: 18 }}>
                        {editExtraId !== null ? "✏️ Editar" : "🎭 Novo"} Elemento Extra
                    </h2>
                    <label style={labelSt}>Nome *</label>
                    <input value={extraForm.nome} autoFocus
                        onChange={e => setExtraForm(f => ({ ...f, nome: e.target.value }))}
                        placeholder="Ex: Prova do Líder, Big Fone..." style={inputSt} />
                    <label style={labelSt}>Descrição</label>
                    <textarea value={extraForm.descricao}
                        onChange={e => setExtraForm(f => ({ ...f, descricao: e.target.value }))}
                        placeholder="Descrição do elemento (opcional)"
                        style={{ ...inputSt, height: 80, resize: "vertical", fontSize: 14, lineHeight: 1.5 }} />

                    <label style={labelSt}>📸 Foto</label>
                    {extraForm.foto ? (
                        <div style={{ position: "relative", marginBottom: 12, maxWidth: 180 }}>
                            <img src={extraForm.foto} alt="" style={{ width: "100%", borderRadius: 10, border: `1px solid ${C.border}` }} />
                            <button onClick={() => setExtraForm(f => ({ ...f, foto: "" }))}
                                style={{
                                    position: "absolute", top: 6, right: 6, width: 26, height: 26,
                                    borderRadius: "50%", border: "none", cursor: "pointer",
                                    background: "rgba(154,66,88,0.9)", color: "#fff", fontSize: 13,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                }}>✕</button>
                        </div>
                    ) : (
                        <label style={{
                            display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px",
                            borderRadius: 10, border: `1px solid ${C.borderHi}`, background: C.surface,
                            color: C.pinkLt, fontSize: 13, fontWeight: 600, cursor: "pointer",
                            marginBottom: 16,
                        }}>
                            📸 Selecionar foto
                            <input type="file" accept="image/*" style={{ display: "none" }}
                                onChange={e => {
                                    const f = e.target.files?.[0]; if (!f) return;
                                    const r = new FileReader();
                                    r.onload = ev => setExtraForm(prev => ({ ...prev, foto: ev.target.result }));
                                    r.readAsDataURL(f); e.target.value = "";
                                }} />
                        </label>
                    )}

                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                        <Btn onClick={saveExtra} style={{ flex: 1 }}>💾 Salvar</Btn>
                        <Btn onClick={() => { setShowExtraForm(false); setEditExtraId(null); }} color={C.surface} textColor={C.textMut}
                            style={{ border: `1px solid ${C.border}` }}>Cancelar</Btn>
                    </div>
                </Modal>
            )}

            {/* ══ MODAL: Quem é você? — Step 1: Selecionar ══ */}
            {showIdentity && !identityConfirm && (
                <Modal onClose={() => { }}>
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>👤</div>
                        <h3 style={{ margin: 0, color: C.text, fontSize: 18 }}>Quem é você?</h3>
                        <p style={{ color: C.textMut, fontSize: 13, margin: "6px 0 0" }}>Selecione seu nome para continuar</p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10, maxHeight: "60vh", overflowY: "auto", padding: "4px" }}>
                        {parts.map(p => {
                            const isElim = calcStatus(p.palpite) === "Eliminado";
                            const fotoUrl = p.fotos?.[0] || null;
                            return (
                                <button key={p.id} onClick={() => setIdentityConfirm(p)}
                                    style={{
                                        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                                        padding: 6, cursor: "pointer", textAlign: "center", transition: "all .15s",
                                    }}>
                                    <div style={{ position: "relative", width: 72, height: 72, margin: "0 auto 4px", borderRadius: 10, overflow: "hidden" }}>
                                        {fotoUrl ? (
                                            <img src={fotoUrl} alt={p.nome}
                                                style={{ width: "100%", height: "100%", objectFit: "cover", filter: isElim ? "grayscale(100%)" : "none" }} />
                                        ) : (
                                            <div style={{ width: "100%", height: "100%", background: C.pinkDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: C.text, filter: isElim ? "grayscale(100%)" : "none" }}>
                                                {p.nome?.[0]}
                                            </div>
                                        )}
                                        {isElim && (
                                            <div style={{
                                                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                                                background: "rgba(0,0,0,0.3)", pointerEvents: "none",
                                            }}>
                                                <span style={{
                                                    color: "rgba(255,255,255,0.7)", fontSize: 9, fontWeight: 800,
                                                    letterSpacing: 1.5, transform: "rotate(-35deg)",
                                                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                                                }}>ELIMINADO(A)</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 11, color: isElim ? C.textMut : C.text, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {p.nome}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </Modal>
            )}

            {/* ══ MODAL: Confirmar identidade — Step 2 ══ */}
            {showIdentity && identityConfirm && (
                <Modal onClose={() => setIdentityConfirm(null)}>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
                        <h3 style={{ margin: 0, color: C.text, fontSize: 18 }}>Você é <span style={{ color: C.pinkLt }}>{identityConfirm.nome}</span>?</h3>
                    </div>

                    {/* Foto do participante */}
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                        <div style={{ width: 140, height: 140, borderRadius: 16, overflow: "hidden", border: `3px solid ${C.pinkLt}`, boxShadow: `0 0 24px rgba(200,100,150,0.3)` }}>
                            {identityConfirm.fotos?.[0] ? (
                                <img src={identityConfirm.fotos[0]} alt={identityConfirm.nome}
                                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            ) : (
                                <div style={{ width: "100%", height: "100%", background: C.pinkDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, color: C.text }}>
                                    {identityConfirm.nome?.[0]}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Aviso permanente */}
                    <div style={{
                        background: "rgba(200,144,64,0.12)", border: "1px solid rgba(200,144,64,0.3)",
                        borderRadius: 12, padding: "12px 14px", marginBottom: 20, textAlign: "center",
                    }}>
                        <p style={{ color: "#C89040", fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                            ⚠️ Atenção: esta escolha é definitiva. Depois de confirmar, o app vai sempre reconhecer que é você quem está usando. Não será possível trocar de identidade.
                        </p>
                    </div>

                    {/* Botões */}
                    <div style={{ display: "flex", gap: 10 }}>
                        <Btn onClick={() => setIdentityConfirm(null)}
                            color={C.surface} textColor={C.textMut}
                            style={{ flex: 1, border: `1px solid ${C.border}` }}>
                            ← Voltar
                        </Btn>
                        <Btn onClick={() => {
                            saveMeId(identityConfirm.id);
                            setIdentityConfirm(null);
                            setShowIdentity(false);
                            showToast(`Bem-vindo(a), ${identityConfirm.nome}! 🎉`);
                        }} style={{ flex: 1 }}>
                            ✅ Confirmar, sou eu!
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* ══ MODAL: Criar Ilustração IA ══ */}
            {showIaModal && (
                <Modal onClose={() => setShowIaModal(false)}>
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>🎨</div>
                        <h3 style={{ margin: 0, color: C.text, fontSize: 18 }}>Criar Ilustração com IA</h3>
                        <p style={{ color: C.textMut, fontSize: 13, margin: "6px 0 0" }}>
                            Escolha um estilo, descreva a cena e selecione quem aparece
                        </p>
                    </div>

                    {/* ── Seletor de Estilo ── */}
                    <label style={labelSt}>Estilo da ilustração</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                        {IA_STYLES.map(s => {
                            const sel = iaStyle === s.id;
                            return (
                                <button key={s.id} onClick={() => setIaStyle(s.id)}
                                    style={{
                                        flex: "1 1 70px", display: "flex", flexDirection: "column", alignItems: "center",
                                        minWidth: 70, maxWidth: 100, padding: "8px 4px", borderRadius: 12, cursor: "pointer",
                                        background: sel ? C.pinkDim : C.card,
                                        border: sel ? `2px solid ${C.pink}` : `1px solid ${C.border}`,
                                        transition: "all .15s",
                                    }}>
                                    <span style={{ fontSize: 22, lineHeight: 1 }}>{s.icon}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: sel ? C.pinkLt : C.text, marginTop: 4, lineHeight: 1.2, textAlign: "center" }}>{s.nome}</span>
                                    <span style={{ fontSize: 8, color: sel ? C.textMut : C.textDim, marginTop: 2, lineHeight: 1.2, textAlign: "center" }}>{s.breve}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Características do estilo selecionado */}
                    {(() => {
                        const cur = IA_STYLES.find(s => s.id === iaStyle);
                        return cur ? (
                            <div style={{ marginBottom: 14, padding: "10px 12px", background: "rgba(0,0,0,0.25)", borderRadius: 10, border: `1px solid ${C.border}` }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: C.pinkLt, marginBottom: 4 }}>{cur.icon} {cur.nome}</div>
                                <div style={{ fontSize: 11, color: C.textMut, lineHeight: 1.5 }}>{cur.caract}</div>
                            </div>
                        ) : null;
                    })()}

                    <label style={labelSt}>Prompt da ilustração</label>
                    <textarea value={iaPrompt} onChange={e => setIaPrompt(e.target.value)}
                        placeholder="Ex: Todos numa festa de piscina em estilo cartoon Pixar..."
                        rows={4}
                        style={{ ...inputSt, resize: "vertical", minHeight: 80 }} />

                    <label style={labelSt}>Participantes ({iaSelParts.length} selecionados)</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                        {parts.map(p => {
                            const sel = iaSelParts.includes(p.id);
                            const isElim = calcStatus(p.palpite) === "Eliminado";
                            const fotoUrl = p.fotos?.[0] || null;
                            return (
                                <button key={p.id} onClick={() => toggleIaPart(p.id)}
                                    style={{
                                        display: "flex", flexDirection: "column", alignItems: "center",
                                        width: 64, padding: "6px 4px", borderRadius: 12, cursor: "pointer",
                                        background: sel ? C.pinkDim : C.card,
                                        border: sel ? `2px solid ${C.pink}` : `1px solid ${C.border}`,
                                        transition: "all .15s",
                                    }}>
                                    <div style={{ position: "relative", width: 44, height: 44, borderRadius: 8, overflow: "hidden" }}>
                                        {fotoUrl ? (
                                            <img src={fotoUrl} alt={p.nome}
                                                style={{ width: "100%", height: "100%", objectFit: "cover", filter: isElim ? "grayscale(100%)" : "none" }} />
                                        ) : (
                                            <div style={{ width: "100%", height: "100%", background: C.pinkDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: C.text, filter: isElim ? "grayscale(100%)" : "none" }}>
                                                {p.nome?.[0]}
                                            </div>
                                        )}
                                        {isElim && (
                                            <div style={{
                                                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                                                background: "rgba(0,0,0,0.3)", pointerEvents: "none",
                                            }}>
                                                <span style={{
                                                    color: "rgba(255,255,255,0.7)", fontSize: 7, fontWeight: 800,
                                                    letterSpacing: 1, transform: "rotate(-35deg)",
                                                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                                                }}>ELIMINADO(A)</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: 9, color: sel ? C.pinkLt : (isElim ? C.textMut : C.text), fontWeight: 600, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 56, textAlign: "center" }}>
                                        {p.nome}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {extras.length > 0 && <>
                        <label style={labelSt}>Extras ({iaSelExtras.length} selecionados)</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                            {extras.map(e => {
                                const sel = iaSelExtras.includes(e.id);
                                return (
                                    <button key={e.id} onClick={() => toggleIaExtra(e.id)}
                                        style={{
                                            display: "flex", flexDirection: "column", alignItems: "center",
                                            width: 64, padding: "6px 4px", borderRadius: 12, cursor: "pointer",
                                            background: sel ? C.pinkDim : C.card,
                                            border: sel ? `2px solid ${C.pink}` : `1px solid ${C.border}`,
                                            transition: "all .15s",
                                        }}>
                                        {e.foto ? (
                                            <img src={e.foto} alt={e.nome}
                                                style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
                                        ) : (
                                            <div style={{ width: 44, height: 44, borderRadius: 8, background: C.pinkDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: C.text }}>
                                                {e.nome?.[0]}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 9, color: sel ? C.pinkLt : C.textMut, fontWeight: 600, marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 56, textAlign: "center" }}>
                                            {e.nome}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>}

                    {/* Alerta quando muitos elementos selecionados */}
                    {(iaSelParts.length + iaSelExtras.length) > 5 && (
                        <div className="ia-warning" style={{
                            background: "rgba(184,120,72,0.12)", border: `1px solid rgba(184,120,72,0.35)`,
                            color: "#B87848",
                        }}>
                            ⚠️ Você selecionou {iaSelParts.length + iaSelExtras.length} elementos. Mais de 5 pode prejudicar a coerência da ilustração gerada.
                        </div>
                    )}

                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                        <Btn onClick={() => setShowIaModal(false)}
                            style={{ flex: 1, background: C.card, border: `1px solid ${C.border}`, color: C.text }}>
                            Cancelar
                        </Btn>
                        <Btn onClick={gerarIlustracao} disabled={!iaPrompt.trim() || iaGenerating}
                            style={{ flex: 2, background: "linear-gradient(135deg, #6B4CE6 0%, #D4567A 100%)" }}>
                            {iaGenerating ? "⏳ Gerando..." : "🎨 Gerar Ilustração"}
                        </Btn>
                    </div>
                </Modal>
            )}
            {iaGenerating && <Spinner />}

            {/* ══ MODAL: Preview e aprovação da ilustração ══ */}
            {iaPreview && (
                <Modal onClose={() => setIaPreview(null)}>
                    <div style={{ textAlign: "center", marginBottom: 16 }}>
                        <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
                        <h3 style={{ margin: 0, color: C.text, fontSize: 18 }}>Ilustração Gerada</h3>
                        <p style={{ color: C.textMut, fontSize: 13, margin: "6px 0 0" }}>Gostou? Aprove para salvar no seu acervo!</p>
                    </div>
                    <img src={iaPreview.url} alt="Ilustração gerada"
                        style={{ width: "100%", display: "block", borderRadius: 16, marginBottom: 16 }} />
                    <p style={{ fontSize: 12, color: C.textMut, fontStyle: "italic", marginBottom: 16 }}>
                        &ldquo;{iaPrompt}&rdquo;
                    </p>

                    {/* Debug — admin only */}
                    {isAdmin && iaPreview.debug && (
                        <details style={{ marginBottom: 16, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                            <summary style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.pinkLt }}>
                                🔍 Debug — O que foi enviado para a IA
                            </summary>
                            <div style={{ padding: "12px 14px", fontSize: 12, color: C.textMut, lineHeight: 1.6 }}>
                                <div style={{ marginBottom: 10 }}>
                                    <strong style={{ color: C.text }}>Modelo:</strong> {iaPreview.debug.model}
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <strong style={{ color: C.text }}>PRD do Sistema:</strong>
                                    <pre style={{ margin: "4px 0 0", padding: 10, background: "rgba(0,0,0,0.3)", borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, fontFamily: "monospace", color: C.textDim, maxHeight: 150, overflowY: "auto" }}>{iaPreview.debug.systemPrd}</pre>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <strong style={{ color: C.text }}>Estilo Visual:</strong>
                                    <pre style={{ margin: "4px 0 0", padding: 10, background: "rgba(0,0,0,0.3)", borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, fontFamily: "monospace", color: C.textDim, maxHeight: 150, overflowY: "auto" }}>{iaPreview.debug.stylePrompt}</pre>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <strong style={{ color: C.text }}>Prompt do Participante:</strong>
                                    <pre style={{ margin: "4px 0 0", padding: 10, background: "rgba(0,0,0,0.3)", borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, fontFamily: "monospace", color: C.textDim, maxHeight: 150, overflowY: "auto" }}>{iaPreview.debug.userPrompt}</pre>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <strong style={{ color: C.text }}>Prompt Combinado (enviado):</strong>
                                    <pre style={{ margin: "4px 0 0", padding: 10, background: "rgba(0,0,0,0.3)", borderRadius: 8, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, fontFamily: "monospace", color: C.textDim, maxHeight: 150, overflowY: "auto" }}>{iaPreview.debug.combinedPrompt}</pre>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <strong style={{ color: C.text }}>Participantes ({iaPreview.debug.participantes.length}):</strong>
                                    <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                                        {iaPreview.debug.participantes.map((p, i) => (
                                            <li key={i}>{p.nome} — {p.fotos} foto(s) enviada(s)</li>
                                        ))}
                                        {iaPreview.debug.participantes.length === 0 && <li style={{ color: C.textDim }}>Nenhum selecionado</li>}
                                    </ul>
                                </div>
                                <div style={{ marginBottom: 10 }}>
                                    <strong style={{ color: C.text }}>Extras ({iaPreview.debug.extras.length}):</strong>
                                    <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>
                                        {iaPreview.debug.extras.map((e, i) => (
                                            <li key={i}>{e.nome} — {e.temFoto ? "✓ foto enviada" : "✗ sem foto"}</li>
                                        ))}
                                        {iaPreview.debug.extras.length === 0 && <li style={{ color: C.textDim }}>Nenhum selecionado</li>}
                                    </ul>
                                </div>
                                <div>
                                    <strong style={{ color: C.text }}>Total de parts no payload:</strong> {iaPreview.debug.totalParts}
                                </div>
                            </div>
                        </details>
                    )}

                    <div style={{ display: "flex", gap: 10 }}>
                        <Btn onClick={aprovarIlustracao} disabled={iaSaving} style={{ flex: 1, background: C.green }}>
                            {iaSaving ? "Salvando..." : "✓ Aprovar e Salvar"}
                        </Btn>
                        <Btn onClick={() => { setIaPreview(null); setShowIaModal(true); }}
                            color={C.surface} textColor={C.pinkLt}
                            style={{ flex: 1, border: `1px solid ${C.borderHi}` }}>
                            ↩ Refazer
                        </Btn>
                    </div>
                </Modal>
            )
            }

            {/* ══ MODAL: Galeria — Fullscreen view ══ */}
            {galeriaView && (
                <Modal onClose={() => setGaleriaView(null)}>
                    <div style={{ textAlign: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 36, marginBottom: 4 }}>🖼️</div>
                        <h3 style={{ margin: 0, color: C.text, fontSize: 17 }}>{galeriaView.autor?.nome || "Anônimo"}</h3>
                        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 6 }}>
                            {galeriaView.estilo && (
                                <span style={{ fontSize: 12, color: C.pinkLt, fontWeight: 600 }}>🎨 {galeriaView.estilo}</span>
                            )}
                            <span style={{ fontSize: 12, color: C.textMut }}>
                                {new Date(galeriaView.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}{" "}
                                {new Date(galeriaView.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                        </div>
                    </div>
                    <img src={galeriaView.url} alt="Ilustração"
                        style={{ width: "100%", display: "block", borderRadius: 16, marginBottom: 12 }} />
                    {galeriaView.prompt && (
                        <p style={{ fontSize: 12, color: C.textMut, fontStyle: "italic", marginBottom: 16, lineHeight: 1.5 }}>
                            &ldquo;{galeriaView.prompt}&rdquo;
                        </p>
                    )}
                    <div style={{ display: "flex", gap: 10 }}>
                        <Btn onClick={() => copyImageToClipboard(galeriaView.url, showToast)}
                            style={{ flex: 1, background: "linear-gradient(135deg, #6B4CE6 0%, #D4567A 100%)" }}>
                            📋 Copiar Imagem
                        </Btn>
                        <Btn onClick={() => setGaleriaView(null)}
                            color={C.surface} textColor={C.textMut}
                            style={{ flex: 1, border: `1px solid ${C.border}` }}>
                            Fechar
                        </Btn>
                    </div>
                </Modal>
            )}

            {/* ══ MODAL: Confirmar delete ══ */}
            {
                delId !== null && (
                    <Modal onClose={() => setDelId(null)}>
                        <div style={{ textAlign: "center", paddingBottom: 8 }}>
                            <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
                            <h3 style={{ margin: "0 0 6px", color: C.text, fontSize: 18 }}>Remover participante?</h3>
                            <p style={{ color: C.textMut, fontSize: 14, marginBottom: 24 }}>
                                {parts.find(p => p.id === delId)?.nome}
                            </p>
                            <div style={{ display: "flex", gap: 10 }}>
                                <Btn onClick={confirmDel} color={C.red} style={{ flex: 1 }}>Remover</Btn>
                                <Btn onClick={() => setDelId(null)} color={C.surface} textColor={C.textMut}
                                    style={{ border: `1px solid ${C.border}`, flex: 1 }}>Cancelar</Btn>
                            </div>
                        </div>
                    </Modal>
                )
            }
        </div >
    );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ children, onClose }) {
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);
    return (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal-inner" style={{
                background: C.card,
                maxWidth: 580,
                border: `1px solid ${C.border}`,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                display: "flex", flexDirection: "column",
            }}>
                {children}
            </div>
        </div>
    );
}

// ── ParticipantCard ───────────────────────────────────────────────────────────
function ParticipantCard({ p, isAdmin, onEdit, onDelete, onAddFoto, onRmFoto }) {
    const status = calcStatus(p.palpite);
    const sc = STATUS_CFG[status];
    const isElim = status === "Eliminado";
    const fileRef = useRef();
    const fotos = p.fotos || [];
    const [idx, setIdx] = useState(0);
    const [sliding, setSliding] = useState(false);

    // Auto-avança a cada 5s quando há mais de 1 foto
    useEffect(() => {
        if (fotos.length <= 1) return;
        const t = setInterval(() => nextFoto(), 5000);
        return () => clearInterval(t);
    }, [fotos.length, idx]);

    const nextFoto = () => {
        if (fotos.length <= 1 || sliding) return;
        setSliding(true);
        setTimeout(() => {
            setIdx(i => (i + 1) % fotos.length);
            setSliding(false);
        }, 350);
    };

    return (
        <div style={{
            background: C.card, borderRadius: 16, overflow: "hidden",
            border: `1px solid ${C.border}`, opacity: isElim ? 0.62 : 1,
            transition: "transform .2s, box-shadow .2s"
        }}
            onTouchStart={() => { }} // enables :active on iOS
        >
            {/* Foto — proporção 3:4 (retrato) */}
            <div
                onClick={fotos.length > 1 ? nextFoto : undefined}
                style={{
                    aspectRatio: "3/4", background: C.surface,
                    position: "relative", overflow: "hidden",
                    cursor: fotos.length > 1 ? "pointer" : "default",
                    filter: isElim ? "grayscale(100%)" : "none",
                }}>
                {fotos.length > 0 ? (
                    <img
                        key={idx}
                        src={fotos[idx]} alt=""
                        style={{
                            width: "100%", height: "100%", objectFit: "cover", display: "block",
                            transform: sliding ? "translateX(-100%)" : "translateX(0)",
                            transition: sliding ? "transform 0.35s ease-in-out" : "none",
                        }}
                    />
                ) : (
                    <img src="/sem-foto.png" alt="Sem foto"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.7 }} />
                )}

                {/* Dots indicadores */}
                {fotos.length > 1 && (
                    <div style={{
                        position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)",
                        display: "flex", gap: 5
                    }}>
                        {fotos.map((_, i) => (
                            <div key={i} style={{
                                width: i === idx ? 14 : 6, height: 6, borderRadius: 3,
                                background: i === idx ? "#fff" : "rgba(255,255,255,0.4)",
                                transition: "all .3s"
                            }} />
                        ))}
                    </div>
                )}

                {/* Banner ELIMINADO(A) */}
                {isElim && (
                    <div style={{
                        position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        pointerEvents: "none", zIndex: 4,
                    }}>
                        <div style={{
                            background: "rgba(154,66,88,0.65)",
                            color: "#fff", fontWeight: 900, fontSize: 18, letterSpacing: 3,
                            padding: "6px 60px",
                            transform: "rotate(-35deg)",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                            minWidth: "150%",
                            textAlign: "center",
                        }}>
                            ELIMINADO(A)
                        </div>
                    </div>
                )}

                {/* Add foto */}
                {isAdmin && (
                    <>
                        <input type="file" ref={fileRef} accept="image/*" style={{ display: "none" }}
                            onChange={e => {
                                const f = e.target.files?.[0]; if (!f) return; const r = new FileReader();
                                r.onload = ev => onAddFoto(ev.target.result); r.readAsDataURL(f); e.target.value = "";
                            }} />
                        <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                            style={{
                                position: "absolute", bottom: 8, right: 8,
                                background: "rgba(8,3,6,0.85)", backdropFilter: "blur(8px)",
                                border: `1px solid ${C.pinkLt}55`, borderRadius: 10,
                                padding: "6px 12px", color: C.pinkLt, cursor: "pointer", fontSize: 12, fontWeight: 700,
                                WebkitTapHighlightColor: "transparent", display: "flex", alignItems: "center", gap: 5
                            }}>
                            📸 {p.fotos?.length > 0 ? `${p.fotos.length} foto(s)` : "+ Foto"}
                        </button>
                        {/* Remover foto atual */}
                        {fotos.length > 0 && (
                            <button onClick={e => { e.stopPropagation(); onRmFoto(idx); setIdx(i => Math.min(i, Math.max(0, fotos.length - 2))); }}
                                style={{
                                    position: "absolute", top: 8, left: 8,
                                    background: "rgba(8,3,6,0.85)", backdropFilter: "blur(8px)",
                                    border: `1px solid ${C.red}55`, borderRadius: 10,
                                    padding: "6px 10px", color: C.red, cursor: "pointer", fontSize: 12, fontWeight: 700,
                                    WebkitTapHighlightColor: "transparent",
                                }}>
                                🗑️
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Info */}
            <div style={{ padding: "12px 12px 14px" }}>
                <h3 style={{
                    margin: "0 0 3px", fontSize: 15, fontWeight: 700, color: C.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                }}>{p.nome}</h3>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: C.textMut }}>
                    {p.palpite ? `🎯 ${fmtPalpite(p.palpite)}` : "Sem palpite"} · {p.fotos?.length || 0} foto(s)
                </p>
                {/* Status badge */}
                <div style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 10px", borderRadius: 20, marginBottom: 10,
                    background: sc.bg, border: `1px solid ${sc.color}44`
                }}>
                    <span style={{ fontSize: 12 }}>{sc.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: sc.color, letterSpacing: 0.3 }}>{status}</span>
                </div>
                {isAdmin && (
                    <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={onEdit}
                            style={{
                                flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                                padding: "8px 0", cursor: "pointer", color: C.textMut, fontSize: 13, fontWeight: 600,
                                WebkitTapHighlightColor: "transparent"
                            }}>
                            ✏️ Editar
                        </button>
                        <button onClick={onDelete}
                            style={{
                                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                                padding: "8px 12px", cursor: "pointer", color: C.textMut, fontSize: 14,
                                WebkitTapHighlightColor: "transparent"
                            }}>
                            🗑️
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
