"use client";
import { useState, useEffect } from "react";
import { FlipGroup, Separator } from "./flip-clock";
import "./flip-clock.css";

/**
 * Compact countdown to midnight (São Paulo timezone).
 * Uses the new premium FlipGroup/Separator components.
 * Drop-in replacement for the old FlipClock in bbb-malu.jsx.
 */
export default function EmbeddedCountdown() {
    const [t, setT] = useState({ h: "--", m: "--", s: "--" });
    const [dotsVisible, setDotsVisible] = useState(true);

    useEffect(() => {
        const getMidnight = () => {
            const brNow = new Date(
                new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
            );
            const brMid = new Date(brNow);
            brMid.setHours(23, 59, 59, 999);
            return Date.now() + (brMid.getTime() - brNow.getTime());
        };

        let target = getMidnight();
        let id: ReturnType<typeof setTimeout>;

        const tick = () => {
            const ms = Math.max(0, target - Date.now());
            const totalSec = Math.floor(ms / 1000);
            const h = String(Math.floor(totalSec / 3600)).padStart(2, "0");
            const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
            const s = String(totalSec % 60).padStart(2, "0");
            setT({ h, m, s });
            setDotsVisible((prev) => !prev);

            if (h === "00" && m === "00" && s === "00") {
                target = getMidnight();
            }
            id = setTimeout(tick, 1000 - (Date.now() % 1000));
        };
        tick();
        return () => clearTimeout(id);
    }, []);

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span
                style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#F0A0BE",
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    opacity: 0.85,
                }}
            >
                Próxima Eliminação
            </span>

            {/* Chassis — compact brushed-metal frame */}
            <div
                className="flip-chassis"
                style={{
                    // Override --card-w to fixed px (CSS uses cqi which needs large container)
                    "--card-w": "34px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 3,
                    background: `
                        repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0px, rgba(0,0,0,0.03) 1px, rgba(255,255,255,0.04) 2px),
                        linear-gradient(180deg, #48484e 0%, #3a3a40 30%, #32323a 70%, #2a2a30 100%)
                    `,
                    borderRadius: 10,
                    padding: "8px 10px 6px",
                    border: "1.5px solid #5a5a60",
                    boxShadow: `
                        0 4px 20px rgba(0,0,0,0.8),
                        0 1px 0 rgba(0,0,0,0.4),
                        inset 0 1px 0 rgba(255,255,255,0.2),
                        inset 0 -1px 0 rgba(0,0,0,0.4),
                        inset 1px 0 0 rgba(255,255,255,0.06),
                        inset -1px 0 0 rgba(255,255,255,0.06)
                    `,
                } as React.CSSProperties}
            >
                <FlipGroup value={t.h} label="Horas" font="Helvetica Neue" color="#e8e8ec" useGradient={false} gradientColor="" />
                <Separator dotsVisible={dotsVisible} />
                <FlipGroup value={t.m} label="Min" font="Helvetica Neue" color="#e8e8ec" useGradient={false} gradientColor="" />
                <Separator dotsVisible={dotsVisible} />
                <FlipGroup value={t.s} label="Seg" font="Helvetica Neue" color="#e8e8ec" useGradient={false} gradientColor="" />
            </div>
        </div>
    );
}
