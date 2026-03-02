"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   useClockTimer — all temporal logic for FlipClock
   Modes: clock, stopwatch, timer, target
   ═══════════════════════════════════════════════════════════════════════════ */

export type ClockMode = "clock" | "stopwatch" | "timer" | "target";

export interface UseClockTimerOptions {
    /** Initial mode (default: "clock") */
    initialMode?: ClockMode;
    /** When the event started — used by stopwatch (elapsed = now - startedAt) and
     *  timer (remaining = durationSecs - elapsed). Accepts Date, ISO string, or epoch ms. */
    startedAt?: Date | string | number;
    /** Total duration in seconds (timer mode only). remaining = durationSecs - elapsed */
    durationSecs?: number;
    /** Target date/time (target mode). Overrides the manual input. */
    externalTargetDate?: Date | string;
    /** Auto-start on mount? Defaults to true when startedAt or externalTargetDate is provided. */
    autoStart?: boolean;
}

/** Normalize Date | ISO string | epoch ms → epoch ms */
function toEpoch(val: Date | string | number): number {
    if (val instanceof Date) return val.getTime();
    if (typeof val === "number") return val;
    // ISO string or local date string
    return new Date(val).getTime();
}

/* Which group indices are allowed per mode (0=YY 1=MM 2=DD 3=HH 4=min 5=SS) */
export const ALLOWED_GROUPS: Record<ClockMode, number[]> = {
    clock: [3, 4, 5],          // HH Min SS
    stopwatch: [3, 4, 5],          // HH Min SS
    timer: [2, 3, 4, 5],       // DD HH Min SS
    target: [0, 1, 2, 3, 4, 5], // all
};

export interface DisplayState {
    YY: string; MM: string; DD: string;
    HH: string; min: string; SS: string;
}

const ZERO: DisplayState = { YY: "00", MM: "00", DD: "00", HH: "00", min: "00", SS: "00" };

function pad(n: number): string { return String(n).padStart(2, "0"); }

/**
 * NOTE: Uses calendar-approximate months (30 days = 2_592_000 s).
 * This is intentional for countdown display; precision isn't required.
 */
const SECS_PER_YEAR = 31_536_000;
const SECS_PER_MONTH = 2_592_000;
const SECS_PER_DAY = 86_400;
const SECS_PER_HOUR = 3_600;

function secsToDisplay(t: number): DisplayState {
    const y = Math.floor(t / SECS_PER_YEAR); t %= SECS_PER_YEAR;
    const mo = Math.floor(t / SECS_PER_MONTH); t %= SECS_PER_MONTH;
    const d = Math.floor(t / SECS_PER_DAY); t %= SECS_PER_DAY;
    const h = Math.floor(t / SECS_PER_HOUR); t %= SECS_PER_HOUR;
    const m = Math.floor(t / 60);
    const s = t % 60;
    return { YY: pad(y), MM: pad(mo), DD: pad(d), HH: pad(h), min: pad(m), SS: pad(s) };
}

function nowDisplay(): DisplayState {
    const now = new Date();
    return {
        YY: pad(now.getFullYear() % 100),
        MM: pad(now.getMonth() + 1),
        DD: pad(now.getDate()),
        HH: pad(now.getHours()),
        min: pad(now.getMinutes()),
        SS: pad(now.getSeconds()),
    };
}

/** Parse "YYYY-MM-DDTHH:MM" as local time (avoid UTC misparse). */
function parseLocalDate(str: string): Date {
    const [datePart, timePart] = str.split("T");
    const [y, mo, d] = datePart.split("-").map(Number);
    const [h, m] = (timePart || "00:00").split(":").map(Number);
    return new Date(y, mo - 1, d, h, m, 0, 0);
}

function defaultTargetDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ── Hook ─────────────────────────────────────────────────────────────────── */
export function useClockTimer(options?: UseClockTimerOptions) {
    const opts = options ?? {};
    const hasExternalStart = opts.startedAt != null;
    const hasExternalTarget = opts.externalTargetDate != null;
    const shouldAutoStart = opts.autoStart ?? (hasExternalStart || hasExternalTarget);

    const [mode, setModeState] = useState<ClockMode>(opts.initialMode ?? "clock");
    const [display, setDisplay] = useState<DisplayState>(ZERO);
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);
    const initializedRef = useRef(false);

    /* ── Group visibility — contiguous, min 2 ── */
    /* Order: YY=0, MM=1, DD=2, HH=3, min=4, SS=5 */
    const [groupVisible, setGroupVisible] = useState([false, false, false, true, true, true]);

    const toggleGroup = useCallback((idx: number) => {
        setGroupVisible(prev => {
            const next = [...prev];
            const vis = prev.reduce<number[]>((acc, v, i) => v ? [...acc, i] : acc, []);
            const minV = Math.min(...vis);
            const maxV = Math.max(...vis);

            if (prev[idx]) {
                // Disabling — must keep min 2 visible
                if (vis.length <= 2) return prev; // can't go below 2

                if (idx === minV) {
                    // Shrink from left edge
                    next[idx] = false;
                } else if (idx === maxV) {
                    // Shrink from right edge
                    next[idx] = false;
                } else {
                    // Middle: disable everything from this idx to the left (keep right side)
                    for (let i = minV; i <= idx; i++) next[i] = false;
                }
            } else {
                // Enabling — fill gap to nearest visible neighbor
                if (idx < minV) {
                    for (let i = idx; i < minV; i++) next[i] = true;
                } else if (idx > maxV) {
                    for (let i = maxV + 1; i <= idx; i++) next[i] = true;
                } else {
                    // Within range (was disabled by middle-removal) — just enable
                    next[idx] = true;
                }
            }

            // Safety: ensure min 2 visible
            const newVis = next.filter(Boolean).length;
            if (newVis < 2) return prev;

            return next;
        });
    }, []);

    /* ── Force-disable groups not allowed for current mode ── */
    useEffect(() => {
        const allowed = ALLOWED_GROUPS[mode];
        setGroupVisible(prev => {
            const next = prev.map((v, i) => allowed.includes(i) ? v : false);
            // Ensure at least 2 allowed groups are visible
            const visCount = next.filter(Boolean).length;
            if (visCount < 2) {
                // enable the last 2 allowed groups
                const last2 = allowed.slice(-2);
                last2.forEach(i => { next[i] = true; });
            }
            return next;
        });
    }, [mode]);

    /* ── Timer inputs ── */
    const [timerDays, setTimerDays] = useState(0);
    const [timerHours, setTimerHours] = useState(0);
    const [timerMins, setTimerMins] = useState(5);
    const [timerSecs, setTimerSecs] = useState(0);

    /* ── Target date ── */
    const [targetDate, setTargetDate] = useState(() => {
        if (hasExternalTarget) {
            const d = opts.externalTargetDate instanceof Date
                ? opts.externalTargetDate
                : new Date(opts.externalTargetDate!);
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        }
        return defaultTargetDate();
    });

    /* ── Refs ── */
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const swStartRef = useRef(0);        // stopwatch: epoch when last started
    const swElapsedRef = useRef(0);      // stopwatch: accumulated ms before pause
    const timerRemRef = useRef(0);       // timer: remaining secs at last start
    const timerStartRef = useRef(0);     // timer: epoch when last started

    /* ── Derived ── */
    const timerTotalSecs = useCallback(() =>
        timerSecs + timerMins * 60 + timerHours * SECS_PER_HOUR + timerDays * SECS_PER_DAY,
        [timerSecs, timerMins, timerHours, timerDays],
    );

    const targetRemaining = useCallback(() =>
        Math.max(0, Math.floor((parseLocalDate(targetDate).getTime() - Date.now()) / 1000)),
        [targetDate],
    );

    /* ── Auto-initialize from external props (runs once on mount) ── */
    useEffect(() => {
        if (initializedRef.current) return;
        initializedRef.current = true;

        if (mode === "stopwatch" && hasExternalStart) {
            const elapsedMs = Date.now() - toEpoch(opts.startedAt!);
            swElapsedRef.current = Math.max(0, elapsedMs);
            setDisplay(secsToDisplay(Math.floor(elapsedMs / 1000)));
            if (shouldAutoStart) setRunning(true);
        } else if (mode === "timer" && hasExternalStart && opts.durationSecs != null) {
            const elapsedSecs = Math.floor((Date.now() - toEpoch(opts.startedAt!)) / 1000);
            const remaining = Math.max(0, opts.durationSecs - elapsedSecs);
            timerRemRef.current = remaining;
            setDisplay(secsToDisplay(remaining));
            if (remaining === 0) {
                setDone(true);
            } else if (shouldAutoStart) {
                setRunning(true);
            }
        } else if (mode === "target" && hasExternalTarget) {
            if (shouldAutoStart) setRunning(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Mode switch — auto-starts clock & target, stops actionable modes ── */
    const setMode = useCallback((m: ClockMode) => {
        // Effects will clean up their own intervals via return()
        setDone(false);
        if (m === "clock" || m === "target") {
            setRunning(true);
        } else {
            setRunning(false);
        }
        setModeState(m);
    }, []);

    /* ── Clock tick ── */
    useEffect(() => {
        if (mode !== "clock") return;
        const tick = () => setDisplay(nowDisplay());
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [mode]);

    /* ── Stopwatch tick ── */
    useEffect(() => {
        if (mode !== "stopwatch" || !running) return;
        swStartRef.current = Date.now();
        const id = setInterval(() => {
            const total = swElapsedRef.current + (Date.now() - swStartRef.current);
            setDisplay(secsToDisplay(Math.floor(total / 1000)));
        }, 200);
        intervalRef.current = id;
        return () => clearInterval(id);
    }, [mode, running]);

    /* ── Timer tick ── */
    useEffect(() => {
        if (mode !== "timer" || !running) return;
        timerStartRef.current = Date.now();
        const id = setInterval(() => {
            const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000);
            const remaining = Math.max(0, timerRemRef.current - elapsed);
            setDisplay(secsToDisplay(remaining));
            if (remaining === 0) {
                clearInterval(id);
                setRunning(false);
                setDone(true);
            }
        }, 200);
        intervalRef.current = id;
        return () => clearInterval(id);
    }, [mode, running]);

    /* ── Target tick — always runs when mode=target & running ── */
    useEffect(() => {
        if (mode !== "target" || !running) return;
        // Immediately show current remaining
        setDisplay(secsToDisplay(targetRemaining()));
        const id = setInterval(() => {
            const remaining = targetRemaining();
            setDisplay(secsToDisplay(remaining));
            if (remaining === 0) {
                clearInterval(id);
                setRunning(false);
                setDone(true);
            }
        }, 200);
        intervalRef.current = id;
        return () => clearInterval(id);
    }, [mode, running, targetRemaining]);

    /* ── Reset display when mode changes (non-clock) ── */
    useEffect(() => {
        if (mode === "clock") return; // clock tick handles its own display
        if (mode === "stopwatch") {
            swElapsedRef.current = 0;
            setDisplay(secsToDisplay(0));
        } else if (mode === "timer") {
            timerRemRef.current = timerTotalSecs();
            setDisplay(secsToDisplay(timerRemRef.current));
        } else if (mode === "target") {
            setDisplay(secsToDisplay(targetRemaining()));
        }
    }, [mode, timerTotalSecs, targetRemaining]);

    /* ── Update timer preview when inputs change (not running) ── */
    useEffect(() => {
        if (mode !== "timer" || running) return;
        timerRemRef.current = timerTotalSecs();
        setDisplay(secsToDisplay(timerRemRef.current));
    }, [timerDays, timerHours, timerMins, timerSecs, mode, running, timerTotalSecs]);

    /* ── Update target when date changes (live — restarts running tick) ── */
    useEffect(() => {
        if (mode !== "target") return;
        setDisplay(secsToDisplay(targetRemaining()));
        if (!running) setRunning(true);
    }, [targetDate, mode, targetRemaining]);  // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Controls ── */
    const handleStart = useCallback(() => {
        setDone(false);
        if (mode === "stopwatch") {
            swStartRef.current = Date.now();
        } else if (mode === "timer") {
            timerStartRef.current = Date.now();
        }
        setRunning(true);
    }, [mode]);

    const handlePause = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (mode === "stopwatch") {
            swElapsedRef.current += Date.now() - swStartRef.current;
        } else if (mode === "timer") {
            timerRemRef.current = Math.max(0,
                timerRemRef.current - Math.floor((Date.now() - timerStartRef.current) / 1000));
        }
        setRunning(false);
    }, [mode]);

    const handleReset = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRunning(false);
        setDone(false);
        if (mode === "stopwatch") {
            swElapsedRef.current = 0;
            setDisplay(secsToDisplay(0));
        } else if (mode === "timer") {
            timerRemRef.current = timerTotalSecs();
            setDisplay(secsToDisplay(timerRemRef.current));
        } else if (mode === "target") {
            setDisplay(secsToDisplay(targetRemaining()));
        }
    }, [mode, timerTotalSecs, targetRemaining]);

    /* ── Synchronized dot blink — shared state for all separators ── */
    const [dotsVisible, setDotsVisible] = useState(true);
    const isActive = mode === "clock" || mode === "target" || running;
    useEffect(() => {
        if (!isActive) { setDotsVisible(true); return; }
        const id = setInterval(() => setDotsVisible(v => !v), 500);
        return () => clearInterval(id);
    }, [isActive]);

    return {
        display,
        mode,
        setMode,
        running,
        done,
        dotsVisible,

        groupVisible, toggleGroup,

        // Timer inputs
        timer: {
            days: timerDays, setDays: setTimerDays,
            hours: timerHours, setHours: setTimerHours,
            mins: timerMins, setMins: setTimerMins,
            secs: timerSecs, setSecs: setTimerSecs,
        },

        // Target
        targetDate, setTargetDate,

        // Controls
        handleStart, handlePause, handleReset,
    };
}
