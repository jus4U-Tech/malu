"use client";

import { useState } from "react";
import { DeviceFrameset } from "react-device-frameset";
import "react-device-frameset/styles/marvel-devices.min.css";

/* ═══════════════════════════════════════════════════════════════════════════════
   DISPOSITIVOS — Mix de frames da lib (antigos) + frames CSS (modernos)
   ═══════════════════════════════════════════════════════════════════════════════ */

type DeviceEntry = {
    id: string;
    label: string;
    group: string;
    width: number;
    height: number;
} & (
        | { type: "lib"; device: string; color?: "black" | "silver" | "gold" }
        | { type: "css"; bezel: number; radius: number; notch?: "dynamic-island" | "notch" | "pill" | "none" }
    );

const DEVICES: DeviceEntry[] = [
    // ── 2025 / Últimos lançamentos ──
    { id: "iphone-17-pro-max", label: "iPhone 17 Pro Max", group: "🔥 2025", type: "css", width: 440, height: 956, bezel: 12, radius: 55, notch: "dynamic-island" },
    { id: "iphone-17-pro", label: "iPhone 17 Pro", group: "🔥 2025", type: "css", width: 402, height: 874, bezel: 12, radius: 55, notch: "dynamic-island" },
    { id: "iphone-16-pro-max", label: "iPhone 16 Pro Max", group: "🔥 2025", type: "css", width: 440, height: 956, bezel: 12, radius: 55, notch: "dynamic-island" },
    { id: "iphone-16-pro", label: "iPhone 16 Pro", group: "🔥 2025", type: "css", width: 402, height: 874, bezel: 12, radius: 55, notch: "dynamic-island" },
    { id: "iphone-16", label: "iPhone 16", group: "🔥 2025", type: "css", width: 393, height: 852, bezel: 12, radius: 50, notch: "dynamic-island" },
    { id: "samsung-s25-ultra", label: "Galaxy S25 Ultra", group: "🔥 2025", type: "css", width: 412, height: 915, bezel: 10, radius: 42, notch: "pill" },
    { id: "samsung-s25", label: "Galaxy S25", group: "🔥 2025", type: "css", width: 360, height: 780, bezel: 10, radius: 38, notch: "pill" },
    { id: "pixel-9-pro", label: "Pixel 9 Pro", group: "🔥 2025", type: "css", width: 412, height: 915, bezel: 10, radius: 44, notch: "pill" },
    { id: "pixel-9", label: "Pixel 9", group: "🔥 2025", type: "css", width: 412, height: 915, bezel: 10, radius: 40, notch: "pill" },
    { id: "oneplus-13", label: "OnePlus 13", group: "🔥 2025", type: "css", width: 412, height: 915, bezel: 10, radius: 42, notch: "pill" },
    { id: "xiaomi-15", label: "Xiaomi 15", group: "🔥 2025", type: "css", width: 393, height: 873, bezel: 10, radius: 40, notch: "pill" },

    // ── 2023–2024 ──
    { id: "iphone-15-pro", label: "iPhone 15 Pro", group: "📱 2023–2024", type: "css", width: 393, height: 852, bezel: 12, radius: 50, notch: "dynamic-island" },
    { id: "iphone-15", label: "iPhone 15", group: "📱 2023–2024", type: "css", width: 390, height: 844, bezel: 12, radius: 50, notch: "dynamic-island" },
    { id: "iphone-14", label: "iPhone 14", group: "📱 2023–2024", type: "css", width: 390, height: 844, bezel: 12, radius: 47, notch: "notch" },
    { id: "samsung-s24", label: "Galaxy S24", group: "📱 2023–2024", type: "css", width: 360, height: 780, bezel: 10, radius: 38, notch: "pill" },
    { id: "pixel-8", label: "Pixel 8", group: "📱 2023–2024", type: "css", width: 412, height: 915, bezel: 10, radius: 40, notch: "pill" },
    { id: "samsung-fold", label: "Galaxy Z Fold", group: "📱 2023–2024", type: "css", width: 373, height: 839, bezel: 8, radius: 28, notch: "pill" },

    // ── Clássicos (lib frames) ──
    { id: "iphone-x", label: "iPhone X", group: "📱 Clássicos", type: "lib", device: "iPhone X", color: "black", width: 375, height: 812 },
    { id: "iphone-8", label: "iPhone 8", group: "📱 Clássicos", type: "lib", device: "iPhone 8", color: "black", width: 375, height: 667 },
    { id: "iphone-8-plus", label: "iPhone 8+", group: "📱 Clássicos", type: "lib", device: "iPhone 8 Plus", color: "black", width: 414, height: 736 },
    { id: "iphone-5s", label: "iPhone 5s", group: "📱 Clássicos", type: "lib", device: "iPhone 5s", color: "black", width: 320, height: 568 },

    // ── Tablets e Desktop ──
    { id: "ipad-mini", label: "iPad Mini", group: "💻 Tablets/Desktop", type: "lib", device: "iPad Mini", color: "black", width: 768, height: 1024 },
    { id: "ipad-pro", label: "iPad Pro 11\"", group: "💻 Tablets/Desktop", type: "css", width: 834, height: 1194, bezel: 18, radius: 24, notch: "none" },
    { id: "macbook-pro", label: "MacBook Pro", group: "💻 Tablets/Desktop", type: "lib", device: "MacBook Pro", width: 1440, height: 900 },
    { id: "macbook", label: "MacBook", group: "💻 Tablets/Desktop", type: "lib", device: "MacBook", width: 1152, height: 720 },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   CSS Frame — Simula dispositivos modernos com CSS puro
   ═══════════════════════════════════════════════════════════════════════════════ */

function CSSDeviceFrame({
    width, height, bezel, radius, notch, landscape, children,
}: {
    width: number; height: number; bezel: number; radius: number;
    notch?: "dynamic-island" | "notch" | "pill" | "none";
    landscape: boolean; children: React.ReactNode;
}) {
    const w = landscape ? height : width;
    const h = landscape ? width : height;

    return (
        <div style={{
            position: "relative",
            width: w + bezel * 2,
            height: h + bezel * 2,
            background: "linear-gradient(145deg, #1a1a1a, #2a2a2a)",
            borderRadius: radius + bezel,
            padding: bezel,
            boxShadow: "0 25px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.05)",
        }}>
            {/* Side buttons */}
            <div style={{
                position: "absolute", right: -3, top: landscape ? "30%" : "20%",
                width: 3, height: 60, background: "#333", borderRadius: "0 3px 3px 0",
            }} />
            <div style={{
                position: "absolute", left: -3, top: landscape ? "20%" : "30%",
                width: 3, height: 35, background: "#333", borderRadius: "3px 0 0 3px",
            }} />
            <div style={{
                position: "absolute", left: -3, top: landscape ? "30%" : "42%",
                width: 3, height: 55, background: "#333", borderRadius: "3px 0 0 3px",
            }} />

            {/* Screen */}
            <div style={{
                width: w, height: h, borderRadius: radius,
                overflow: "hidden", position: "relative", background: "#000",
            }}>
                {/* Dynamic Island / Notch / Pill */}
                {notch === "dynamic-island" && (
                    <div style={{
                        position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
                        width: 126, height: 37, background: "#000",
                        borderRadius: 20, zIndex: 10,
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                    }} />
                )}
                {notch === "notch" && (
                    <div style={{
                        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                        width: 210, height: 30, background: "#000",
                        borderRadius: "0 0 20px 20px", zIndex: 10,
                    }} />
                )}
                {notch === "pill" && (
                    <div style={{
                        position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
                        width: 80, height: 8, background: "#000",
                        borderRadius: 10, zIndex: 10,
                        boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
                    }} />
                )}

                {children}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Mobile Browser Chrome — Simula Safari/Chrome mobile
   ═══════════════════════════════════════════════════════════════════════════════ */

function MobileBrowserChrome({ url, children }: { url: string; children: React.ReactNode }) {
    const displayUrl = `bbb-malu.vercel.app${url === "/" ? "" : url}`;

    return (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#1c1c1e" }}>
            {/* Status Bar */}
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 24px 0 24px", height: 44, flexShrink: 0, fontSize: 14, fontWeight: 600, color: "#fff",
            }}>
                <span>9:41</span>
                <span style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 13 }}>
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="0.5" /><rect x="4" y="5" width="3" height="7" rx="0.5" /><rect x="8" y="2" width="3" height="10" rx="0.5" /><rect x="12" y="0" width="3" height="12" rx="0.5" /></svg>
                    <span style={{ marginLeft: 2 }}>5G</span>
                    <svg width="24" height="12" viewBox="0 0 24 12" fill="none" style={{ marginLeft: 4 }}><rect x="0" y="0" width="21" height="12" rx="3" stroke="#fff" strokeWidth="1.5" /><rect x="2" y="2" width="15" height="8" rx="1.5" fill="#34C759" /><rect x="22.5" y="3.5" width="2" height="5" rx="1" fill="#fff" opacity="0.4" /></svg>
                </span>
            </div>

            {/* Safari Address Bar */}
            <div style={{ padding: "8px 12px", flexShrink: 0 }}>
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 12px",
                    fontSize: 13, color: "rgba(255,255,255,0.7)",
                }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1L6 1C8.76 1 11 3.24 11 6C11 8.76 8.76 11 6 11C3.24 11 1 8.76 1 6C1 3.24 3.24 1 6 1Z" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" /><path d="M4 6H8M6 4V8" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" /></svg>
                    <span style={{ letterSpacing: 0.3 }}>{displayUrl}</span>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                {children}
            </div>

            {/* Bottom Safari Toolbar */}
            <div style={{
                display: "flex", justifyContent: "space-around", alignItems: "center",
                padding: "8px 0 20px", flexShrink: 0, borderTop: "1px solid rgba(255,255,255,0.1)",
            }}>
                {["◀", "▶", "⬆", "📖", "▢▢"].map((icon, i) => (
                    <span key={i} style={{ fontSize: 16, color: i === 0 || i === 1 ? "rgba(255,255,255,0.25)" : "#007AFF", cursor: "default" }}>
                        {icon}
                    </span>
                ))}
            </div>

            {/* Home indicator */}
            <div style={{
                width: 134, height: 5, background: "rgba(255,255,255,0.3)",
                borderRadius: 3, margin: "0 auto 8px",
            }} />
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Preview Page
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function PreviewPage() {
    const iphone15Index = DEVICES.findIndex(d => d.id === "iphone-15");
    const [selected, setSelected] = useState(DEVICES[iphone15Index >= 0 ? iphone15Index : 0]);
    const [url, setUrl] = useState("/");
    const [landscape, setLandscape] = useState(false);
    const [showBrowser, setShowBrowser] = useState(false);

    const groups = Array.from(new Set(DEVICES.map(d => d.group)));

    const iframeEl = (
        <iframe
            key={selected.id + url + landscape}
            src={url}
            style={{ width: "100%", height: "100%", border: "none", background: "#0d0d1a" }}
            title={`Preview - ${selected.label}`}
        />
    );

    const contentEl = showBrowser && selected.type === "css" && !selected.label.includes("MacBook") && !selected.label.includes("iPad")
        ? <MobileBrowserChrome url={url}>{iframeEl}</MobileBrowserChrome>
        : iframeEl;

    const scale = selected.width >= 1000 ? 0.55
        : selected.width >= 768 ? 0.6
            : 0.85;

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #0a0a1a 0%, #1a1025 50%, #0d0d1a 100%)",
            padding: "20px",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
            {/* Header */}
            <div style={{
                maxWidth: 1200, margin: "0 auto 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 12,
            }}>
                <div>
                    <h1 style={{
                        margin: 0, fontSize: 22, fontWeight: 800,
                        background: "linear-gradient(135deg, #E84F8A, #A855F7)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>
                        📱 Device Preview
                    </h1>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                        Visualize o app em diferentes dispositivos
                    </p>
                </div>
                <a href="/" style={{
                    fontSize: 13, color: "#E84F8A", textDecoration: "none",
                    padding: "8px 16px", border: "1px solid rgba(232,79,138,0.3)",
                    borderRadius: 10, background: "rgba(232,79,138,0.1)",
                }}>
                    ← Voltar ao app
                </a>
            </div>

            {/* Device Selector — grouped */}
            <div style={{ maxWidth: 1200, margin: "0 auto 16px" }}>
                {groups.map(group => (
                    <div key={group} style={{ marginBottom: 6 }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
                            {group}
                        </div>
                        <div style={{
                            display: "flex", gap: 4, flexWrap: "wrap",
                        }}>
                            {DEVICES.filter(d => d.group === group).map(d => (
                                <button key={d.id} onClick={() => setSelected(d)}
                                    style={{
                                        padding: "4px 8px", borderRadius: 7,
                                        background: selected.id === d.id
                                            ? "linear-gradient(135deg, #E84F8A, #A855F7)"
                                            : "rgba(255,255,255,0.05)",
                                        color: selected.id === d.id ? "#fff" : "rgba(255,255,255,0.5)",
                                        cursor: "pointer", fontSize: 10, fontWeight: 600,
                                        whiteSpace: "nowrap", transition: "all .2s",
                                        border: selected.id === d.id ? "none" : "1px solid rgba(255,255,255,0.08)",
                                    }}>
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Controls row */}
            <div style={{
                maxWidth: 1200, margin: "0 auto 10px",
                display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center",
            }}>
                {/* Landscape toggle */}
                {!selected.label.includes("MacBook") && (
                    <button onClick={() => setLandscape(!landscape)}
                        style={{
                            padding: "5px 10px", borderRadius: 8,
                            background: landscape ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${landscape ? "rgba(168,85,247,0.4)" : "rgba(255,255,255,0.12)"}`,
                            color: landscape ? "#A855F7" : "rgba(255,255,255,0.5)",
                            cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all .2s",
                        }}>
                        🔄 {landscape ? "Paisagem" : "Retrato"}
                    </button>
                )}

                {/* Browser chrome toggle */}
                <button onClick={() => setShowBrowser(!showBrowser)}
                    style={{
                        padding: "5px 10px", borderRadius: 8,
                        background: showBrowser ? "rgba(0,122,255,0.2)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${showBrowser ? "rgba(0,122,255,0.4)" : "rgba(255,255,255,0.12)"}`,
                        color: showBrowser ? "#007AFF" : "rgba(255,255,255,0.5)",
                        cursor: "pointer", fontSize: 11, fontWeight: 600, transition: "all .2s",
                    }}>
                    🌐 {showBrowser ? "Safari ON" : "Safari OFF"}
                </button>

                {/* URL buttons */}
                {[
                    { label: "🏠 App", path: "/" },
                    { label: "⏱️ Countdown", path: "/countdown" },
                ].map(({ label, path }) => (
                    <button key={path} onClick={() => setUrl(path)}
                        style={{
                            padding: "5px 10px", borderRadius: 8,
                            background: url === path ? "rgba(232,79,138,0.2)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${url === path ? "rgba(232,79,138,0.4)" : "rgba(255,255,255,0.12)"}`,
                            color: url === path ? "#E84F8A" : "rgba(255,255,255,0.5)",
                            cursor: "pointer", fontSize: 11, fontWeight: 600,
                        }}>
                        {label}
                    </button>
                ))}

                {/* Device info */}
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>
                    📐 {landscape ? selected.height : selected.width} × {landscape ? selected.width : selected.height}px
                    {selected.type === "css" && " · CSS Frame"}
                    {selected.type === "lib" && " · Marvel Frame"}
                </span>
            </div>

            {/* Device Frame */}
            <div style={{
                display: "flex", justifyContent: "center", alignItems: "flex-start",
                padding: "20px 0", overflow: "auto",
                transform: `scale(${scale})`,
                transformOrigin: "top center",
            }}>
                {selected.type === "css" ? (
                    <CSSDeviceFrame
                        width={selected.width} height={selected.height}
                        bezel={selected.bezel} radius={selected.radius}
                        notch={selected.notch} landscape={landscape}
                    >
                        {contentEl}
                    </CSSDeviceFrame>
                ) : (
                    <DeviceFrameset
                        device={selected.device as any}
                        color={selected.color}
                        landscape={landscape && !selected.label.includes("MacBook")}
                    >
                        {contentEl}
                    </DeviceFrameset>
                )}
            </div>
        </div>
    );
}
