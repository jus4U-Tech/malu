"use client";

import { useState, useEffect, useRef, memo, Fragment, type CSSProperties, type ReactNode } from "react";
import "./flip-clock.css";
import { useClockTimer, ALLOWED_GROUPS, type DisplayState, type ClockMode, type UseClockTimerOptions } from "./use-clock-timer";

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */

const FLIP_DURATION_MS = 600;

const FONTS = [
    { label: "Oswald", value: "'Oswald', sans-serif", url: "https://fonts.googleapis.com/css2?family=Oswald:wght@600&display=swap" },
    { label: "Bebas Neue", value: "'Bebas Neue', cursive", url: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" },
    { label: "Roboto Mono", value: "'Roboto Mono', monospace", url: "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@700&display=swap" },
    { label: "Share Tech Mono", value: "'Share Tech Mono', monospace", url: "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" },
    { label: "Orbitron", value: "'Orbitron', sans-serif", url: "https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap" },
    { label: "Anton", value: "'Anton', sans-serif", url: "https://fonts.googleapis.com/css2?family=Anton&display=swap" },
] as const;

const COLORS = [
    { label: "Branco", value: "#FFFFFF" },
    { label: "Amarelo", value: "#FFD700" },
    { label: "Vermelho", value: "#FF4040" },
    { label: "Verde Neon", value: "#39FF14" },
    { label: "Ciano", value: "#00FFFF" },
    { label: "Laranja", value: "#FF8C00" },
] as const;

const MODE_LABELS: { id: ClockMode; label: string }[] = [
    { id: "clock", label: "Relógio" },
    { id: "stopwatch", label: "Cronômetro" },
    { id: "timer", label: "Timer" },
    { id: "target", label: "Data e Hora Alvo" },
];

/* ── Visual constants ─────────────────────────────────────────────────────── */
const BG_TOP = "linear-gradient(180deg, #2e2e2e 0%, #1e1e1e 100%)";
const BG_BOT = "linear-gradient(180deg, #181818 0%, #0f0f0f 100%)";
/* Frame & clip dimensions now in CSS as --frame-inset, --clip-w, --clip-h, --clip-r, --clip-pos */

const STACKED_CARDS = [
    { yFrac: 0.06, xPx: 3, shadow: "0 7px 14px rgba(0,0,0,0.9)", bgDark: 0 },
    { yFrac: 0.11, xPx: 5, shadow: "0 13px 26px rgba(0,0,0,0.9)", bgDark: 12 },
    { yFrac: 0.15, xPx: 7, shadow: "0 18px 36px rgba(0,0,0,0.9)", bgDark: 24 },
] as const;

const CHASSIS_BOX_SHADOW = [
    "0 60px 120px rgba(0,0,0,0.97)",
    "0 24px 48px rgba(0,0,0,0.85)",
    "inset 0 1px 0 rgba(255,255,255,0.11)",
    "inset 0 -2px 0 rgba(0,0,0,0.9)",
    "inset 1px 0 0 rgba(255,255,255,0.05)",
    "inset -1px 0 0 rgba(0,0,0,0.5)",
].join(",");

/* ── Font loading — checks DOM to survive HMR ────────────────────────────── */
function ensureFontsLoaded(): void {
    FONTS.forEach(f => {
        if (document.querySelector(`link[href="${f.url}"]`)) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = f.url;
        document.head.appendChild(link);
    });
}

/* ── Types ─────────────────────────────────────────────────────────────────── */
interface DigitRendererProps {
    d: string;
    showTop: boolean;
    font: string;
    color: string;
    useGradient: boolean;
    gradientColor: string;
}

interface FlipDigitProps {
    value: string;
    font: string;
    color: string;
    useGradient: boolean;
    gradientColor: string;
}

interface FlipGroupProps {
    value: string;
    font: string;
    color: string;
    label: string;
    useGradient: boolean;
    gradientColor: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
   DigitRenderer — EXTRACTED outside FlipDigit to preserve identity across
   renders. Prevents unmount/remount that kills CSS animations.
   ═══════════════════════════════════════════════════════════════════════════ */
const DigitRenderer = memo(function DigitRenderer({
    d, showTop, font, color, useGradient, gradientColor,
}: DigitRendererProps) {
    const textStyle: CSSProperties = useGradient
        ? {
            background: `linear-gradient(180deg, ${color} 0%, ${gradientColor} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
        }
        : { color };

    return (
        <div style={{
            position: "absolute",
            top: showTop ? 0 : "calc(var(--half-h) * -1)",
            left: 0,
            width: "var(--card-w)",
            height: "var(--card-h)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: font,
            fontSize: "var(--font-size)",
            fontWeight: 700,
            lineHeight: 1,
            userSelect: "none",
            pointerEvents: "none",
        }}>
            <span style={textStyle}>{d}</span>
        </div>
    );
});

/* ═══════════════════════════════════════════════════════════════════════════
   FlipDigit — single digit with split-flap animation
   ═══════════════════════════════════════════════════════════════════════════ */
export const FlipDigit = memo(function FlipDigit({
    value, font, color, useGradient, gradientColor,
}: FlipDigitProps) {
    const shownRef = useRef(value);
    const nextRef = useRef(value);
    const isFlipRef = useRef(false);
    const rafRef = useRef<number | null>(null);

    const [shown, setShown] = useState(value);
    const [next, setNext] = useState(value);
    const [isFlipping, setIsFlipping] = useState(false);
    const [flipKey, setFlipKey] = useState(0);

    useEffect(() => {
        if (value === shownRef.current) {
            return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
        }

        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);

        if (isFlipRef.current) {
            shownRef.current = nextRef.current;
            isFlipRef.current = false;
            setShown(nextRef.current);
            setIsFlipping(false);
        }

        nextRef.current = value;

        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = requestAnimationFrame(() => {
                isFlipRef.current = true;
                setNext(value);
                setIsFlipping(true);
                setFlipKey(k => k + 1);
            });
        });

        return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
    }, [value]);

    const digitProps = { font, color, useGradient, gradientColor };

    return (
        <div style={{ position: "relative", width: "var(--card-w)", height: "var(--card-h)" }}>

            {/* Stacked cards depth */}
            {STACKED_CARDS.map(({ yFrac, xPx, shadow, bgDark }, i) => (
                <div key={i} style={{
                    position: "absolute",
                    top: `calc(var(--card-h) * ${yFrac})`,
                    left: xPx,
                    width: `calc(var(--card-w) - ${xPx * 2}px)`,
                    height: "var(--card-h)",
                    borderRadius: "var(--card-r)",
                    background: `linear-gradient(180deg, #1c1c1c ${bgDark}%, #0b0b0b 100%)`,
                    boxShadow: shadow,
                    border: "1px solid rgba(255,255,255,0.025)",
                    zIndex: -(i + 1),
                }} />
            ))}

            {/* BOT-STATIC */}
            <div style={{
                position: "absolute", top: "50%", left: 0,
                width: "var(--card-w)", height: "50%", overflow: "hidden",
                borderRadius: "0 0 var(--card-r) var(--card-r)",
                background: BG_BOT, zIndex: 1,
            }}>
                <DigitRenderer d={shown} showTop={false} {...digitProps} />
            </div>

            {/* NEXT-TOP */}
            {isFlipping && (
                <div style={{
                    position: "absolute", top: 0, left: 0,
                    width: "var(--card-w)", height: "50%", overflow: "hidden",
                    borderRadius: "var(--card-r) var(--card-r) 0 0",
                    background: BG_TOP, zIndex: 2,
                    boxShadow: "inset 0 2px 4px rgba(255,255,255,0.04)",
                }}>
                    <DigitRenderer d={next} showTop {...digitProps} />
                </div>
            )}

            {/* TOP-STATIC */}
            {!isFlipping && (
                <div style={{
                    position: "absolute", top: 0, left: 0,
                    width: "var(--card-w)", height: "50%", overflow: "hidden",
                    borderRadius: "var(--card-r) var(--card-r) 0 0",
                    background: BG_TOP, zIndex: 3,
                    boxShadow: "inset 0 2px 4px rgba(255,255,255,0.04)",
                }}>
                    <DigitRenderer d={shown} showTop {...digitProps} />
                </div>
            )}

            {/* FLAP */}
            {isFlipping && (
                <div
                    key={flipKey}
                    onAnimationEnd={() => {
                        shownRef.current = nextRef.current;
                        isFlipRef.current = false;
                        setShown(nextRef.current);
                        setIsFlipping(false);
                    }}
                    style={{
                        position: "absolute", top: 0, left: 0,
                        width: "var(--card-w)", height: "50%",
                        transformOrigin: "center bottom",
                        transformStyle: "preserve-3d",
                        animation: `flipCard ${FLIP_DURATION_MS}ms cubic-bezier(0.4,0,0.2,1) forwards`,
                        zIndex: 10,
                    }}
                >
                    {/* FRONT FACE */}
                    <div style={{
                        position: "absolute", inset: 0, overflow: "hidden",
                        borderRadius: "var(--card-r) var(--card-r) 0 0",
                        background: BG_TOP,
                        backfaceVisibility: "hidden",
                        boxShadow: "inset 0 2px 4px rgba(255,255,255,0.04)",
                    }}>
                        <DigitRenderer d={shown} showTop {...digitProps} />
                        <div style={{
                            position: "absolute", inset: 0, pointerEvents: "none",
                            background: "rgba(0,0,0,0.7)",
                            animation: `shadowFront ${FLIP_DURATION_MS}ms cubic-bezier(0.4,0,0.2,1) forwards`,
                        }} />
                    </div>

                    {/* BACK FACE */}
                    <div style={{
                        position: "absolute", inset: 0, overflow: "hidden",
                        borderRadius: "0 0 var(--card-r) var(--card-r)",
                        background: BG_BOT,
                        backfaceVisibility: "hidden",
                        transform: "rotateX(180deg)",
                        boxShadow: "inset 0 -2px 8px rgba(0,0,0,0.4)",
                    }}>
                        <DigitRenderer d={next} showTop={false} {...digitProps} />
                        <div style={{
                            position: "absolute", inset: 0, pointerEvents: "none",
                            background: "rgba(0,0,0,0.7)",
                            animation: `shadowBack ${FLIP_DURATION_MS}ms cubic-bezier(0.4,0,0.2,1) forwards`,
                        }} />
                    </div>
                </div>
            )}

            {/* Metallic frame */}
            <div style={{
                position: "absolute",
                inset: "calc(var(--frame-inset) * -1)",
                borderRadius: "calc(var(--card-r) + var(--frame-inset))",
                background: "linear-gradient(148deg,#5c5c5c 0%,#3a3a3a 22%,#4a4a4a 44%,#272727 64%,#3c3c3c 82%,#191919 100%)",
                zIndex: -1,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18),inset 0 -1px 0 rgba(0,0,0,0.9),inset 1px 0 0 rgba(255,255,255,0.08),inset -1px 0 0 rgba(0,0,0,0.6),0 8px 24px rgba(0,0,0,0.85)",
            }} />
            <div style={{
                position: "absolute", inset: -2,
                borderRadius: "calc(var(--card-r) + 2px)",
                border: "1px solid rgba(0,0,0,0.9)",
                zIndex: 0, pointerEvents: "none",
            }} />
            <div style={{
                position: "absolute",
                top: "calc(var(--frame-inset) * -1)",
                left: "calc(var(--frame-inset) * -1)",
                right: "calc(var(--frame-inset) * -1)",
                height: "calc(var(--frame-inset) * 2)",
                borderRadius: "calc(var(--card-r) + var(--frame-inset)) calc(var(--card-r) + var(--frame-inset)) 0 0",
                background: "linear-gradient(180deg,rgba(255,255,255,0.13) 0%,transparent 100%)",
                zIndex: 0, pointerEvents: "none",
            }} />

            {/* Gloss */}
            <div style={{
                position: "absolute", top: 0, left: 0,
                width: "var(--card-w)", height: "50%",
                borderRadius: "var(--card-r) var(--card-r) 0 0",
                background: "linear-gradient(180deg,rgba(255,255,255,0.055) 0%,rgba(255,255,255,0.004) 100%)",
                pointerEvents: "none", zIndex: 22,
            }} />

            {/* Divider */}
            <div style={{
                position: "absolute", top: "calc(50% - 1.5px)", left: 0,
                width: "var(--card-w)", height: 3,
                background: "linear-gradient(90deg,#030303 0%,#111 25%,#111 75%,#030303 100%)",
                zIndex: 23, pointerEvents: "none",
            }} />

            {/* Clip tabs */}
            {([0, 1] as const).map(i => (
                <div key={i} style={{
                    position: "absolute",
                    top: "calc(50% - var(--clip-h) / 2)",
                    [i === 0 ? "left" : "right"]: "var(--clip-pos)",
                    width: "var(--clip-w)", height: "var(--clip-h)", borderRadius: "var(--clip-r)",
                    background: "linear-gradient(180deg,#606060 0%,#3a3a3a 48%,#4c4c4c 100%)",
                    boxShadow: "inset 0 1px 2px rgba(255,255,255,0.18),inset 0 -1px 2px rgba(0,0,0,0.7),0 2px 5px rgba(0,0,0,0.9)",
                    zIndex: 24,
                }}>
                    <div style={{
                        position: "absolute", top: "50%", left: "10%", right: "10%",
                        height: 1.5, background: "rgba(0,0,0,0.55)", transform: "translateY(-50%)",
                    }} />
                </div>
            ))}
        </div>
    );
});


/* ═══════════════════════════════════════════════════════════════════════════
   FlipGroup — two-digit group with label
   ═══════════════════════════════════════════════════════════════════════════ */
export const FlipGroup = memo(function FlipGroup({
    value, font, color, label, useGradient, gradientColor,
}: FlipGroupProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--card-gap)" }}>
            <div style={{ display: "flex", gap: "var(--card-gap)" }}>
                <FlipDigit value={value[0]} font={font} color={color} useGradient={useGradient} gradientColor={gradientColor} />
                <FlipDigit value={value[1]} font={font} color={color} useGradient={useGradient} gradientColor={gradientColor} />
            </div>
            {label && (
                <div style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: "var(--label-size)",
                    letterSpacing: 2,
                    color: "rgba(255,255,255,0.32)",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                }}>
                    {label}
                </div>
            )}
        </div>
    );
});

/* ═══════════════════════════════════════════════════════════════════════════
   Separator
   ═══════════════════════════════════════════════════════════════════════════ */
export function Separator({ dotsVisible }: { dotsVisible: boolean }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{
                display: "flex", flexDirection: "column",
                justifyContent: "center", alignItems: "center",
                width: "100%",
                height: "var(--card-h)",
                gap: "calc(var(--card-h) * 0.14)",
                opacity: dotsVisible ? 1 : 0,
                transition: "opacity 0.05s",
            }}>
                {([0, 1] as const).map(i => (
                    <div key={i} style={{
                        width: "var(--dot-size)", height: "var(--dot-size)", borderRadius: "50%",
                        background: "radial-gradient(circle at 35% 35%, #888 0%, #444 55%, #222 100%)",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.9), inset 0 1px 2px rgba(255,255,255,0.1)",
                    }} />
                ))}
            </div>
            <div style={{ height: "calc(var(--label-size) + var(--card-gap))" }} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ControlRow
   ═══════════════════════════════════════════════════════════════════════════ */
function ControlRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{
                fontSize: 10, letterSpacing: 3,
                color: "rgba(255,255,255,0.33)",
                textTransform: "uppercase", minWidth: 52,
            }}>
                {label}
            </span>
            {children}
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN — FlipClock
   ═══════════════════════════════════════════════════════════════════════════ */
export default function FlipClock(props?: UseClockTimerOptions) {
    useEffect(() => { ensureFontsLoaded(); }, []);

    const {
        display, mode, setMode,
        running, done, dotsVisible,
        groupVisible, toggleGroup,
        timer,
        targetDate, setTargetDate,
        handleStart, handlePause, handleReset,
    } = useClockTimer(props);

    /* ── Visual state ── */
    const [font, setFont] = useState<string>(FONTS[0].value);
    const [color, setColor] = useState<string>(COLORS[0].value);
    const [customColor, setCustomColor] = useState("#FFFFFF");
    const [opacity, setOpacity] = useState(100);
    const [useGradient, setUseGradient] = useState(false);
    const [gradientColor, setGradientColor] = useState("#FFD700");

    const effectiveColor = color === "custom" ? customColor : color;
    const digitStyleProps = { font, color: effectiveColor, useGradient, gradientColor };

    const ALL_GROUPS: Array<{ key: keyof DisplayState; label: string; short: string }> = [
        { key: "YY", label: "Anos", short: "AA" },
        { key: "MM", label: "Meses", short: "MM" },
        { key: "DD", label: "Dias", short: "DD" },
        { key: "HH", label: "Horas", short: "HH" },
        { key: "min", label: "Minutos", short: "Min" },
        { key: "SS", label: "Segundos", short: "SS" },
    ];
    const visibleGroups = ALL_GROUPS.filter((_, i) => groupVisible[i]);

    return (
        <div style={{
            minHeight: "100vh",
            background: "radial-gradient(ellipse at 50% 20%, #141a2e 0%, #080810 55%, #000 100%)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "40px 20px", gap: 36,
            fontFamily: "'Oswald', sans-serif", color: "#fff",
        }}>

            {/* Top: title + resizable test panel + chassis */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
                <div style={{
                    fontSize: 10, letterSpacing: 7, marginBottom: 38,
                    color: "rgba(255,255,255,0.22)", textTransform: "uppercase",
                }}>
                    Flip Clock
                </div>

                {/* Resizable test panel */}
                <div style={{
                    resize: "both",
                    overflow: "hidden",
                    width: 640,
                    height: 200,
                    minWidth: 80,
                    minHeight: 40,
                    maxWidth: "100%",
                    border: "1px dashed rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: 12,
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                }}>
                    {/* Container query wrapper — scales chassis to parent width */}
                    <div className="flip-clock-wrapper">
                        <div className="flip-chassis" style={{
                            ["--num-cards" as string]: visibleGroups.length * 2,
                            position: "relative",
                            background: "linear-gradient(160deg, #2e2e2e 0%, #1b1b1b 45%, #222 75%, #161616 100%)",
                            opacity: opacity / 100,
                            borderRadius: "var(--card-r)",
                            padding: "var(--chassis-pad)",
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--group-gap)",
                            flexWrap: "nowrap",
                            justifyContent: "center",
                            boxShadow: CHASSIS_BOX_SHADOW,
                            border: "1px solid rgba(255,255,255,0.055)",
                        }}>
                            {/* Brushed metal texture */}
                            <div style={{
                                position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
                                background: "repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(255,255,255,0.01) 3px, rgba(255,255,255,0.01) 4px)",
                            }} />
                            <div style={{
                                position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
                                background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 30%)",
                            }} />

                            {visibleGroups.map((g, i) => (
                                <Fragment key={g.key}>
                                    <FlipGroup value={display[g.key]} label={g.label} {...digitStyleProps} />
                                    {i < visibleGroups.length - 1 && <Separator dotsVisible={dotsVisible} />}
                                </Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Resize handle indicator */}
                    <div style={{
                        position: "absolute", bottom: 2, right: 8, fontSize: 10,
                        color: "rgba(255,255,255,0.2)", pointerEvents: "none",
                        userSelect: "none",
                    }}>⟷ arrastar</div>
                </div>

                {done && (
                    <div style={{
                        marginTop: 24, fontSize: 18, letterSpacing: 4,
                        color: "#FF5540", animation: "pulse 0.7s infinite alternate",
                        fontFamily: "'Oswald', sans-serif",
                    }}>
                        ⏱ TEMPO ESGOTADO
                    </div>
                )}
            </div>

            {/* ── Controls ── */}
            <div style={{
                display: "flex", flexDirection: "column", gap: 22,
                background: "rgba(255,255,255,0.022)", borderRadius: 16,
                padding: "28px 32px",
                border: "1px solid rgba(255,255,255,0.055)",
                width: "100%", maxWidth: 640,
            }}>
                <ControlRow label="Modo">
                    {MODE_LABELS.map(({ id, label }) => (
                        <button key={id}
                            onClick={() => setMode(id)}
                            style={{
                                background: mode === id ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.04)",
                                color: mode === id ? "#fff" : "rgba(255,255,255,0.36)",
                                border: `1px solid ${mode === id ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)"}`,
                                padding: "8px 18px", fontSize: 11, letterSpacing: 2,
                                borderRadius: 8, cursor: "pointer",
                                fontFamily: "'Oswald', sans-serif",
                                transition: "all 0.2s",
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </ControlRow>

                <ControlRow label="Exibir">
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        {ALL_GROUPS.map((g, i) => {
                            const allowed = ALLOWED_GROUPS[mode];
                            if (!allowed.includes(i)) return null;
                            return (
                                <label key={g.key} style={{
                                    display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                                    fontSize: 12, color: "rgba(255,255,255,0.52)",
                                }}>
                                    <input type="checkbox" checked={groupVisible[i]} onChange={() => toggleGroup(i)}
                                        style={{ accentColor: "#888", width: 14, height: 14, colorScheme: "dark" }} />
                                    {g.short}
                                </label>
                            );
                        })}
                    </div>
                </ControlRow>

                <ControlRow label="Fonte">
                    <select value={font} onChange={e => setFont(e.target.value)} style={{
                        background: "#1a1a1a", border: "1px solid #333", color: "#fff",
                        borderRadius: 6, padding: "6px 10px", fontSize: 13, cursor: "pointer",
                    }}>
                        {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                </ControlRow>

                <ControlRow label="Cor">
                    <div style={{ display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" }}>
                        {COLORS.map(c => (
                            <div key={c.value} title={c.label} onClick={() => setColor(c.value)} style={{
                                width: 26, height: 26, borderRadius: "50%", background: c.value,
                                cursor: "pointer", transition: "transform 0.15s",
                                border: `3px solid ${color === c.value ? "#fff" : "transparent"}`,
                                transform: color === c.value ? "scale(1.25)" : "scale(1)",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.6)",
                            }} />
                        ))}
                        <div title="Personalizada" onClick={() => setColor("custom")} style={{
                            width: 26, height: 26, borderRadius: "50%",
                            background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                            cursor: "pointer", transition: "transform 0.15s",
                            border: `3px solid ${color === "custom" ? "#fff" : "transparent"}`,
                            transform: color === "custom" ? "scale(1.25)" : "scale(1)",
                        }} />
                        {color === "custom" && (
                            <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)}
                                style={{ width: 38, height: 26, border: "none", background: "none", cursor: "pointer", padding: 0 }} />
                        )}
                    </div>
                </ControlRow>

                <ControlRow label="Opacidade">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <input type="range" min={10} max={100} value={opacity}
                            onChange={e => setOpacity(Number(e.target.value))}
                            style={{ width: 140, accentColor: "#888" }} />
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", minWidth: 36 }}>{opacity}%</span>
                    </div>
                </ControlRow>

                <ControlRow label="Gradiente">
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.52)" }}>
                        <input type="checkbox" checked={useGradient} onChange={e => setUseGradient(e.target.checked)}
                            style={{ accentColor: "#888", width: 16, height: 16 }} />
                        Ativar
                    </label>
                    {useGradient && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Cor final:</span>
                            <input type="color" value={gradientColor} onChange={e => setGradientColor(e.target.value)}
                                style={{ width: 38, height: 26, border: "none", background: "none", cursor: "pointer", padding: 0 }} />
                            <div style={{
                                width: 80, height: 20, borderRadius: 4,
                                background: `linear-gradient(90deg, ${effectiveColor}, ${gradientColor})`,
                                border: "1px solid rgba(255,255,255,0.1)",
                            }} />
                        </div>
                    )}
                </ControlRow>

                {/* Timer: duration inputs */}
                {mode === "timer" && (
                    <ControlRow label="Duração">
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
                            {[
                                { label: "Dias", val: timer.days, set: timer.setDays },
                                { label: "Horas", val: timer.hours, set: timer.setHours },
                                { label: "Min", val: timer.mins, set: timer.setMins },
                                { label: "Seg", val: timer.secs, set: timer.setSecs },
                            ].map(({ label, val, set }) => (
                                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                    <span style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.33)", textTransform: "uppercase" }}>{label}</span>
                                    <input type="number" min={0} max={99} value={val}
                                        onChange={e => set(Math.max(0, parseInt(e.target.value) || 0))}
                                        disabled={running}
                                        style={{
                                            background: "#1a1a1a", border: "1px solid #333", color: "#fff",
                                            borderRadius: 6, padding: "4px 8px", width: 64,
                                            textAlign: "center", fontSize: 14,
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </ControlRow>
                )}

                {/* Target: datetime picker */}
                {mode === "target" && (
                    <ControlRow label="Data e Hora Alvo">
                        <input
                            type="datetime-local"
                            value={targetDate}
                            onChange={e => { setTargetDate(e.target.value); }}
                            disabled={running}
                            style={{
                                background: "#1a1a1a", border: "1px solid #333", color: "#fff",
                                borderRadius: 6, padding: "6px 10px", fontSize: 13, cursor: "pointer",
                                colorScheme: "dark",
                            }}
                        />
                    </ControlRow>
                )}

                {/* Play / Pause / Reset (timer & stopwatch only) */}
                {(mode === "timer" || mode === "stopwatch") && (
                    <div style={{ display: "flex", gap: 10 }}>
                        {!running
                            ? <button onClick={handleStart} style={{
                                background: "rgba(255,255,255,0.10)", color: "#fff",
                                border: "1px solid rgba(255,255,255,0.16)", letterSpacing: 2,
                                borderRadius: 8, padding: "10px 24px", cursor: "pointer",
                                fontFamily: "'Oswald', sans-serif", fontSize: 14, transition: "all 0.2s",
                            }}>▶ INICIAR</button>
                            : <button onClick={handlePause} style={{
                                background: "rgba(255,120,80,0.14)", color: "#ff9977",
                                border: "1px solid rgba(255,120,80,0.24)", letterSpacing: 2,
                                borderRadius: 8, padding: "10px 24px", cursor: "pointer",
                                fontFamily: "'Oswald', sans-serif", fontSize: 14, transition: "all 0.2s",
                            }}>⏸ PAUSAR</button>
                        }
                        <button onClick={handleReset} style={{
                            background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.38)",
                            border: "1px solid rgba(255,255,255,0.07)", letterSpacing: 2,
                            borderRadius: 8, padding: "10px 24px", cursor: "pointer",
                            fontFamily: "'Oswald', sans-serif", fontSize: 14, transition: "all 0.2s",
                        }}>{mode === "stopwatch" ? "↺ ZERAR" : "↺ RESET"}</button>
                    </div>
                )}

            </div>
        </div>
    );
}
