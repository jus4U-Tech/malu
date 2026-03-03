"use client";

import { useState, useRef } from "react";

// ── Paleta (mesma do app principal) ─────────────────────────────────────────
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
    green: "#5A9070",
    red: "#9A4258",
    overlay: "rgba(8,3,6,0.95)",
};

type LogEntry = {
    nome: string;
    status: "ok" | "fail" | "skip" | "processing";
    reason?: string;
};

export default function BatchReprocessPage() {
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);
    const [total, setTotal] = useState(0);
    const [current, setCurrent] = useState(0);
    const [processed, setProcessed] = useState(0);
    const [failed, setFailed] = useState(0);
    const [currentName, setCurrentName] = useState("");
    const [prd, setPrd] = useState("");
    const [log, setLog] = useState<LogEntry[]>([]);
    const [error, setError] = useState("");
    const abortRef = useRef<AbortController | null>(null);

    const percent = total > 0 ? Math.round((current / total) * 100) : 0;

    const start = async () => {
        setRunning(true);
        setDone(false);
        setLog([]);
        setError("");
        setCurrent(0);
        setTotal(0);
        setProcessed(0);
        setFailed(0);
        setCurrentName("");
        setPrd("");

        const abort = new AbortController();
        abortRef.current = abort;

        try {
            const res = await fetch("/api/batch-reprocess", {
                method: "POST",
                signal: abort.signal,
            });

            if (!res.ok || !res.body) {
                setError(`HTTP ${res.status}`);
                setRunning(false);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done: readerDone, value } = await reader.read();
                if (readerDone) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                let eventType = "";
                for (const line of lines) {
                    if (line.startsWith("event: ")) {
                        eventType = line.slice(7).trim();
                    } else if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            handleEvent(eventType, data);
                        } catch { /* skip mal-formed */ }
                    }
                }
            }
        } catch (err) {
            if ((err as Error).name !== "AbortError") {
                setError((err as Error).message || "Erro de conexão");
            }
        } finally {
            setRunning(false);
            setDone(true);
        }
    };

    const handleEvent = (event: string, data: Record<string, unknown>) => {
        switch (event) {
            case "init":
                setTotal(data.total as number);
                setPrd(data.prdPrompt as string);
                break;
            case "progress":
                setCurrent(data.current as number);
                setProcessed(data.processed as number);
                setFailed(data.failed as number);
                setCurrentName(data.nome as string);
                if (data.status !== "processing") {
                    setLog(prev => [...prev, {
                        nome: data.nome as string,
                        status: data.status as LogEntry["status"],
                        reason: data.reason as string | undefined,
                    }]);
                }
                break;
            case "done":
                setProcessed(data.processed as number);
                setFailed(data.failed as number);
                setTotal(data.total as number);
                setCurrent(data.total as number);
                break;
            case "error":
                setError(data.message as string);
                break;
        }
    };

    const cancel = () => {
        abortRef.current?.abort();
    };

    // ── Gauge SVG ───────────────────────────────────────────────────────────
    const radius = 90;
    const stroke = 12;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div style={{
            minHeight: "100vh", background: C.bg, color: C.text,
            fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "40px 20px",
        }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
                @keyframes gauge-glow {
                    0%,100% { filter: drop-shadow(0 0 6px ${C.pink}40); }
                    50% { filter: drop-shadow(0 0 16px ${C.pink}80); }
                }
            `}</style>

            {/* Header */}
            <h1 style={{
                fontSize: 22, fontWeight: 800, color: C.pinkLt,
                margin: "0 0 8px", textAlign: "center",
                letterSpacing: 0.5,
            }}>
                🍌 Nano Banana — Batch Reprocess
            </h1>
            <p style={{ color: C.textMut, fontSize: 13, margin: "0 0 32px", textAlign: "center" }}>
                Reprocessa todas as fotos originais com o PRD de tratamento via Gemini
            </p>

            {/* Gauge */}
            <div style={{ position: "relative", width: 220, height: 220, marginBottom: 28 }}>
                <svg
                    width={220} height={220}
                    style={{
                        transform: "rotate(-90deg)",
                        animation: running ? "gauge-glow 2s ease-in-out infinite" : "none",
                    }}
                >
                    {/* Background track */}
                    <circle
                        cx={110} cy={110} r={radius}
                        fill="none" stroke={C.border}
                        strokeWidth={stroke}
                    />
                    {/* Progress arc */}
                    <circle
                        cx={110} cy={110} r={radius}
                        fill="none"
                        stroke={done && failed === 0 ? C.green : C.pink}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
                    />
                </svg>

                {/* Center text */}
                <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                }}>
                    <span style={{
                        fontSize: 48, fontWeight: 900, color: C.text,
                        lineHeight: 1,
                    }}>
                        {percent}%
                    </span>
                    <span style={{
                        fontSize: 12, color: C.textMut, marginTop: 4,
                    }}>
                        {current}/{total} fotos
                    </span>
                </div>
            </div>

            {/* Current processing */}
            {running && currentName && (
                <div style={{
                    background: C.pinkDim, borderRadius: 12,
                    padding: "10px 20px", marginBottom: 20,
                    display: "flex", alignItems: "center", gap: 10,
                    animation: "pulse 1.5s ease-in-out infinite",
                }}>
                    <div style={{
                        width: 16, height: 16, borderRadius: "50%",
                        border: `3px solid ${C.pinkLt}`,
                        borderTopColor: "transparent",
                        animation: "spin 0.8s linear infinite",
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                        Processando: {currentName}
                    </span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{
                    background: "rgba(154,66,88,0.2)", border: `1px solid ${C.red}`,
                    borderRadius: 12, padding: "12px 18px", marginBottom: 16,
                    color: "#ff8a9e", fontSize: 14, maxWidth: 420, textAlign: "center",
                }}>
                    ❌ {error}
                </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
                {!running && !done && (
                    <button onClick={start} style={{
                        background: C.pink, color: "#fff", border: "none",
                        borderRadius: 14, padding: "14px 28px",
                        fontWeight: 700, fontSize: 16, cursor: "pointer",
                        transition: "filter .15s",
                    }}>
                        🚀 Iniciar Reprocessamento
                    </button>
                )}
                {running && (
                    <button onClick={cancel} style={{
                        background: C.red, color: "#fff", border: "none",
                        borderRadius: 14, padding: "14px 28px",
                        fontWeight: 700, fontSize: 16, cursor: "pointer",
                    }}>
                        ⏹ Cancelar
                    </button>
                )}
                {done && (
                    <button onClick={() => { setDone(false); setLog([]); setError(""); setCurrent(0); setTotal(0); }} style={{
                        background: C.pink, color: "#fff", border: "none",
                        borderRadius: 14, padding: "14px 28px",
                        fontWeight: 700, fontSize: 16, cursor: "pointer",
                    }}>
                        🔄 Executar Novamente
                    </button>
                )}
            </div>

            {/* Summary */}
            {(running || done) && total > 0 && (
                <div style={{
                    display: "flex", gap: 20, marginBottom: 24,
                    flexWrap: "wrap", justifyContent: "center",
                }}>
                    <Stat label="Total" value={total} color={C.pinkLt} />
                    <Stat label="Processadas" value={processed} color={C.green} />
                    <Stat label="Falhas" value={failed} color={C.red} />
                </div>
            )}

            {/* PRD */}
            {prd && (
                <div style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 12, padding: "10px 16px", marginBottom: 20,
                    maxWidth: 420, width: "100%",
                }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.pinkLt, letterSpacing: 0.8, textTransform: "uppercase" }}>
                        PRD Prompt
                    </span>
                    <p style={{ fontSize: 13, color: C.textMut, margin: "4px 0 0", lineHeight: 1.4 }}>
                        {prd}…
                    </p>
                </div>
            )}

            {/* Log */}
            {log.length > 0 && (
                <div style={{
                    background: C.surface, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: 16, maxWidth: 520, width: "100%",
                    maxHeight: 360, overflowY: "auto",
                }}>
                    <span style={{
                        fontSize: 11, fontWeight: 700, color: C.pinkLt,
                        letterSpacing: 0.8, textTransform: "uppercase",
                        display: "block", marginBottom: 10,
                    }}>
                        Log de Processamento
                    </span>
                    {log.map((entry, i) => (
                        <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "6px 0",
                            borderBottom: i < log.length - 1 ? `1px solid ${C.border}` : "none",
                        }}>
                            <span style={{ fontSize: 16 }}>
                                {entry.status === "ok" ? "✅" : entry.status === "skip" ? "⏭" : "❌"}
                            </span>
                            <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                                {entry.nome}
                            </span>
                            {entry.reason && (
                                <span style={{ fontSize: 12, color: C.textMut }}>
                                    {entry.reason}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Done summary */}
            {done && !error && total > 0 && (
                <div style={{
                    marginTop: 20, padding: "16px 24px",
                    background: failed === 0 ? "rgba(90,144,112,0.15)" : "rgba(184,120,72,0.15)",
                    border: `1px solid ${failed === 0 ? C.green : C.gold}`,
                    borderRadius: 14, textAlign: "center",
                }}>
                    <span style={{ fontSize: 20 }}>
                        {failed === 0 ? "🎉" : "⚠️"}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 700, marginLeft: 8 }}>
                        {failed === 0
                            ? `Todas as ${processed} fotos processadas!`
                            : `${processed} processadas, ${failed} falhas`
                        }
                    </span>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color }}>{value}</div>
            <div style={{ fontSize: 11, color: "rgba(244,230,238,0.45)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>
                {label}
            </div>
        </div>
    );
}
