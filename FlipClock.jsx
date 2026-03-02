import { useState, useEffect, useRef } from "react";

const FONTS = [
  { label: "Oswald",          value: "'Oswald', sans-serif",        url: "https://fonts.googleapis.com/css2?family=Oswald:wght@600&display=swap" },
  { label: "Bebas Neue",      value: "'Bebas Neue', cursive",        url: "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" },
  { label: "Roboto Mono",     value: "'Roboto Mono', monospace",     url: "https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@700&display=swap" },
  { label: "Share Tech Mono", value: "'Share Tech Mono', monospace", url: "https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap" },
  { label: "Orbitron",        value: "'Orbitron', sans-serif",       url: "https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap" },
  { label: "Anton",           value: "'Anton', sans-serif",          url: "https://fonts.googleapis.com/css2?family=Anton&display=swap" },
];

const COLORS = [
  { label: "Branco",     value: "#FFFFFF" },
  { label: "Amarelo",    value: "#FFD700" },
  { label: "Vermelho",   value: "#FF4040" },
  { label: "Verde Neon", value: "#39FF14" },
  { label: "Ciano",      value: "#00FFFF" },
  { label: "Laranja",    value: "#FF8C00" },
];

function pad(n) { return String(n).padStart(2, "0"); }

const GLOBAL_CSS = `
  .flip-chassis {
    container-type: inline-size;
    container-name: chassis;
    --card-w:      clamp(52px, 8vw, 88px);
    --card-h:      clamp(68px, 10.5vw, 116px);
    --card-r:      clamp(4px, 0.6vw, 7px);
    --card-gap:    clamp(8px, 1.2vw, 14px);
    --group-gap:   clamp(14px, 2.2vw, 28px);
    --chassis-pad: clamp(16px, 3vw, 40px);
    --dot-size:    clamp(5px, 0.7vw, 8px);
    --label-size:  clamp(8px, 0.9vw, 10px);
    --font-size:   calc(var(--card-h) * 0.74);
    --half-h:      calc(var(--card-h) / 2);
  }
  @container chassis (max-width: 480px) {
    .flip-chassis {
      --card-w:      clamp(40px, 12cqi, 68px);
      --card-h:      clamp(52px, 16cqi, 90px);
      --card-r:      clamp(3px, 0.8cqi, 6px);
      --card-gap:    clamp(5px, 1.5cqi, 10px);
      --group-gap:   clamp(8px, 2.5cqi, 18px);
      --chassis-pad: clamp(10px, 2.5cqi, 20px);
    }
  }
  @container chassis (max-width: 320px) {
    .flip-chassis {
      --card-w:      clamp(32px, 10cqi, 44px);
      --card-h:      clamp(42px, 14cqi, 58px);
      --card-r:      3px;
      --card-gap:    4px;
      --group-gap:   6px;
      --chassis-pad: 8px;
      --dot-size:    4px;
      --label-size:  7px;
    }
  }
  @keyframes flipCard {
    0%   { transform: perspective(400px) rotateX(0deg); }
    100% { transform: perspective(400px) rotateX(-180deg); }
  }
  @keyframes shadowFront {
    0%   { opacity: 0;    }
    45%  { opacity: 0;    }
    50%  { opacity: 0.75; }
    100% { opacity: 0.75; }
  }
  @keyframes shadowBack {
    0%   { opacity: 0.75; }
    50%  { opacity: 0.75; }
    55%  { opacity: 0;    }
    100% { opacity: 0;    }
  }
  @keyframes pulse { from { opacity:1; } to { opacity:0.2; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input[type=number] {
    background: #1a1a1a; border: 1px solid #333; color: #fff;
    border-radius: 6px; padding: 4px 8px; width: 70px;
    text-align: center; font-size: 14px;
  }
  input[type=number]::-webkit-inner-spin-button { opacity: 0.5; }
  select {
    background: #1a1a1a; border: 1px solid #333; color: #fff;
    border-radius: 6px; padding: 6px 10px; font-size: 13px; cursor: pointer;
  }
  button {
    cursor: pointer; border: none; border-radius: 8px;
    padding: 10px 24px; font-family: 'Oswald', sans-serif;
    font-size: 14px; letter-spacing: 1px; transition: all 0.2s;
  }
`;

const DURATION = 600;

function FlipDigit({ value, font, color, useGradient = false, gradientColor = "#FFD700" }) {
  const shownRef  = useRef(value);
  const nextRef   = useRef(value);
  const isFlipRef = useRef(false);

  const [shown,      setShown]      = useState(value);
  const [next,       setNext]       = useState(value);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipKey,    setFlipKey]    = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (value === shownRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (isFlipRef.current) {
      const snapped = nextRef.current;
      shownRef.current = snapped;
      isFlipRef.current = false;
      setShown(snapped);
      setIsFlipping(false);
    }
    nextRef.current = value;
    rafRef.current = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isFlipRef.current = true;
        setNext(value);
        setIsFlipping(true);
        setFlipKey(k => k + 1);
      });
    });
  }, [value]);

  const bgTop = "linear-gradient(180deg, #2e2e2e 0%, #1e1e1e 100%)";
  const bgBot = "linear-gradient(180deg, #181818 0%, #0f0f0f 100%)";

  const Digit = ({ d, showTop }) => {
    const gradientStyle = useGradient ? {
      background: `linear-gradient(180deg, ${color} 0%, ${gradientColor} 100%)`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
    } : { color };
    return (
      <div style={{
        position: "absolute",
        top: showTop ? 0 : "calc(var(--half-h) * -1)",
        left: 0,
        width: "var(--card-w)", height: "var(--card-h)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: font, fontSize: "var(--font-size)", fontWeight: 700,
        lineHeight: 1, userSelect: "none", pointerEvents: "none",
        ...gradientStyle,
      }}>{d}</div>
    );
  };

  return (
    <div style={{ position: "relative", width: "var(--card-w)", height: "var(--card-h)" }}>
      {[
        {yPct:"6%", xPx:3, shadow:"0 7px 14px rgba(0,0,0,0.9)"},
        {yPct:"11%",xPx:5, shadow:"0 13px 26px rgba(0,0,0,0.9)"},
        {yPct:"15%",xPx:7, shadow:"0 18px 36px rgba(0,0,0,0.9)"},
      ].map(({yPct,xPx,shadow},i) => (
        <div key={i} style={{
          position:"absolute",
          top:`calc(var(--card-h) * ${parseFloat(yPct)/100})`,
          left:xPx, width:`calc(var(--card-w) - ${xPx*2}px)`, height:"var(--card-h)",
          borderRadius:"var(--card-r)",
          background:`linear-gradient(180deg,#1c1c1c ${i*12}%,#0b0b0b 100%)`,
          boxShadow:shadow, border:"1px solid rgba(255,255,255,0.025)", zIndex:-(i+1),
        }}/>
      ))}

      {/* BOT-STATIC */}
      <div style={{
        position:"absolute", top:"50%", left:0,
        width:"var(--card-w)", height:"50%", overflow:"hidden",
        borderRadius:"0 0 var(--card-r) var(--card-r)",
        background:bgBot, zIndex:1,
      }}>
        <Digit d={shown} showTop={false} />
      </div>

      {/* NEXT-TOP */}
      {isFlipping && (
        <div style={{
          position:"absolute", top:0, left:0,
          width:"var(--card-w)", height:"50%", overflow:"hidden",
          borderRadius:"var(--card-r) var(--card-r) 0 0",
          background:bgTop, zIndex:2,
          boxShadow:"inset 0 2px 4px rgba(255,255,255,0.04)",
        }}>
          <Digit d={next} showTop={true} />
        </div>
      )}

      {/* TOP-STATIC */}
      {!isFlipping && (
        <div style={{
          position:"absolute", top:0, left:0,
          width:"var(--card-w)", height:"50%", overflow:"hidden",
          borderRadius:"var(--card-r) var(--card-r) 0 0",
          background:bgTop, zIndex:3,
          boxShadow:"inset 0 2px 4px rgba(255,255,255,0.04)",
        }}>
          <Digit d={shown} showTop={true} />
        </div>
      )}

      {/* FLAP */}
      {isFlipping && (
        <div
          key={flipKey}
          onAnimationEnd={() => {
            const completed = nextRef.current;
            shownRef.current = completed;
            isFlipRef.current = false;
            setShown(completed);
            setIsFlipping(false);
          }}
          style={{
            position:"absolute", top:0, left:0,
            width:"var(--card-w)", height:"50%",
            transformOrigin:"center bottom",
            transformStyle:"preserve-3d",
            animation:`flipCard ${DURATION}ms cubic-bezier(0.4,0,0.2,1) forwards`,
            zIndex:10,
          }}
        >
          <div style={{
            position:"absolute", inset:0, overflow:"hidden",
            borderRadius:"var(--card-r) var(--card-r) 0 0",
            background:bgTop,
            backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden",
            boxShadow:"inset 0 2px 4px rgba(255,255,255,0.04)",
          }}>
            <Digit d={shown} showTop={true} />
            <div style={{
              position:"absolute", inset:0, pointerEvents:"none",
              background:"rgba(0,0,0,0.7)",
              animation:`shadowFront ${DURATION}ms cubic-bezier(0.4,0,0.2,1) forwards`,
            }}/>
          </div>
          <div style={{
            position:"absolute", inset:0, overflow:"hidden",
            borderRadius:"0 0 var(--card-r) var(--card-r)",
            background:bgBot,
            backfaceVisibility:"hidden", WebkitBackfaceVisibility:"hidden",
            transform:"rotateX(180deg)",
            boxShadow:"inset 0 -2px 8px rgba(0,0,0,0.4)",
          }}>
            <Digit d={next} showTop={false} />
            <div style={{
              position:"absolute", inset:0, pointerEvents:"none",
              background:"rgba(0,0,0,0.7)",
              animation:`shadowBack ${DURATION}ms cubic-bezier(0.4,0,0.2,1) forwards`,
            }}/>
          </div>
        </div>
      )}

      {/* Metallic frame */}
      <div style={{
        position:"absolute", inset:-4, borderRadius:"calc(var(--card-r) + 4px)",
        background:"linear-gradient(148deg,#5c5c5c 0%,#3a3a3a 22%,#4a4a4a 44%,#272727 64%,#3c3c3c 82%,#191919 100%)",
        zIndex:-1,
        boxShadow:"inset 0 1px 0 rgba(255,255,255,0.18),inset 0 -1px 0 rgba(0,0,0,0.9),inset 1px 0 0 rgba(255,255,255,0.08),inset -1px 0 0 rgba(0,0,0,0.6),0 8px 24px rgba(0,0,0,0.85)",
      }}/>
      <div style={{position:"absolute",inset:-2,borderRadius:"calc(var(--card-r) + 2px)",border:"1px solid rgba(0,0,0,0.9)",zIndex:0,pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:-4,left:-4,right:-4,height:8,borderRadius:"calc(var(--card-r) + 4px) calc(var(--card-r) + 4px) 0 0",background:"linear-gradient(180deg,rgba(255,255,255,0.13) 0%,transparent 100%)",zIndex:0,pointerEvents:"none"}}/>
      <div style={{position:"absolute",top:0,left:0,width:"var(--card-w)",height:"50%",borderRadius:"var(--card-r) var(--card-r) 0 0",background:"linear-gradient(180deg,rgba(255,255,255,0.055) 0%,rgba(255,255,255,0.004) 100%)",pointerEvents:"none",zIndex:22}}/>
      <div style={{position:"absolute",top:"calc(50% - 1.5px)",left:0,width:"var(--card-w)",height:3,background:"linear-gradient(90deg,#030303 0%,#111 25%,#111 75%,#030303 100%)",zIndex:23,pointerEvents:"none"}}/>
      {[5,-13].map((side,i) => (
        <div key={i} style={{
          position:"absolute",top:"calc(50% - 9px)",[i===0?"left":"right"]:5,width:8,height:18,borderRadius:3,
          background:"linear-gradient(180deg,#606060 0%,#3a3a3a 48%,#4c4c4c 100%)",
          boxShadow:"inset 0 1px 2px rgba(255,255,255,0.18),inset 0 -1px 2px rgba(0,0,0,0.7),0 2px 5px rgba(0,0,0,0.9)",
          zIndex:24,
        }}>
          <div style={{position:"absolute",top:"50%",left:"10%",right:"10%",height:1.5,background:"rgba(0,0,0,0.55)",transform:"translateY(-50%)"}}/>
        </div>
      ))}
    </div>
  );
}

function FlipGroup({ value, font, color, label, useGradient = false, gradientColor = "#FFD700" }) {
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
          letterSpacing: 2, color: "rgba(255,255,255,0.32)", textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}>{label}</div>
      )}
    </div>
  );
}

function Separator() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center",
        width: "100%", height: "var(--card-h)",
        gap: "calc(var(--card-h) * 0.14)",
      }}>
        {[0, 1].map(i => (
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

function Row({ label, children }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{
        fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.33)",
        textTransform: "uppercase", minWidth: 52,
      }}>{label}</span>
      {children}
    </div>
  );
}

export default function FlipClock() {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    FONTS.forEach(f => {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = f.url;
      document.head.appendChild(link);
    });
  }, []);

  // ── Appearance ──────────────────────────────────────────────────────────
  const [showYears,     setShowYears]     = useState(false);
  const [showMonths,    setShowMonths]    = useState(false);
  const [font,          setFont]          = useState(FONTS[0].value);
  const [color,         setColor]         = useState(COLORS[0].value);
  const [customColor,   setCustomColor]   = useState("#FFFFFF");
  const [opacity,       setOpacity]       = useState(100);
  const [useGradient,   setUseGradient]   = useState(false);
  const [gradientColor, setGradientColor] = useState("#FFD700");
  const effectiveColor = color === "custom" ? customColor : color;

  // ── Mode: "clock" | "stopwatch" | "timer" | "target" ───────────────────
  const [mode, setMode] = useState("clock");

  // Timer (duration-based countdown)
  const [timerDays,  setTimerDays]  = useState(0);
  const [timerHours, setTimerHours] = useState(0);
  const [timerMins,  setTimerMins]  = useState(5);
  const [timerSecs,  setTimerSecs]  = useState(0);

  // Target (date-based countdown)
  const defaultTarget = () => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0,0,0,0);
    // Build local datetime string "YYYY-MM-DDTHH:MM" without UTC conversion
    const pad2 = n => String(n).padStart(2,"0");
    return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  };
  const [targetDate, setTargetDate] = useState(defaultTarget);

  // Shared running state
  const [running, setRunning] = useState(false);
  const [done,    setDone]    = useState(false);

  const [display, setDisplay] = useState({
    YY: "00", MM: "00", DD: "00", HH: "00", min: "00", SS: "00",
  });

  const intervalRef  = useRef(null);
  const swStartRef   = useRef(0);   // stopwatch: epoch when started
  const swElapsedRef = useRef(0);   // stopwatch: accumulated ms before last pause
  const timerRemRef  = useRef(0);   // timer: remaining seconds at last start
  const timerStartRef= useRef(0);   // timer: epoch when last started

  // ── Helpers ──────────────────────────────────────────────────────────────
  function secsToDisplay(t) {
    const y  = Math.floor(t / 31536000); t %= 31536000;
    const mo = Math.floor(t / 2592000);  t %= 2592000;
    const d  = Math.floor(t / 86400);    t %= 86400;
    const h  = Math.floor(t / 3600);     t %= 3600;
    const m  = Math.floor(t / 60);
    const s  = t % 60;
    return { YY: pad(y), MM: pad(mo), DD: pad(d), HH: pad(h), min: pad(m), SS: pad(s) };
  }

  function timerTotalSecs() {
    return timerSecs + timerMins * 60 + timerHours * 3600 + timerDays * 86400;
  }

  function parseLocalDate(str) {
    // "YYYY-MM-DDTHH:MM" → local time (avoid UTC misparse)
    const [datePart, timePart] = str.split("T");
    const [y, mo, d] = datePart.split("-").map(Number);
    const [h, m]     = (timePart || "00:00").split(":").map(Number);
    return new Date(y, mo - 1, d, h, m, 0, 0);
  }
  function targetRemaining() {
    return Math.max(0, Math.floor((parseLocalDate(targetDate).getTime() - Date.now()) / 1000));
  }

  // ── Reset display whenever mode changes ──────────────────────────────────
  useEffect(() => {
    clearInterval(intervalRef.current);
    setRunning(false); setDone(false);
    if (mode === "clock") {
      // clock ticks via its own effect below
    } else if (mode === "stopwatch") {
      swElapsedRef.current = 0;
      setDisplay(secsToDisplay(0));
    } else if (mode === "timer") {
      timerRemRef.current = timerTotalSecs();
      setDisplay(secsToDisplay(timerRemRef.current));
    } else if (mode === "target") {
      setDisplay(secsToDisplay(targetRemaining()));
    }
  }, [mode]);

  // ── Clock: real time ─────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "clock") return;
    const tick = () => {
      const now = new Date();
      setDisplay({
        YY:  pad(now.getFullYear() % 100),
        MM:  pad(now.getMonth() + 1),
        DD:  pad(now.getDate()),
        HH:  pad(now.getHours()),
        min: pad(now.getMinutes()),
        SS:  pad(now.getSeconds()),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mode]);

  // ── Stopwatch tick ───────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "stopwatch" || !running) return;
    swStartRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const total = swElapsedRef.current + (Date.now() - swStartRef.current);
      setDisplay(secsToDisplay(Math.floor(total / 1000)));
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, [mode, running]);

  // ── Timer tick ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "timer" || !running) return;
    timerStartRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed    = Math.floor((Date.now() - timerStartRef.current) / 1000);
      const remaining  = Math.max(0, timerRemRef.current - elapsed);
      setDisplay(secsToDisplay(remaining));
      if (remaining === 0) {
        clearInterval(intervalRef.current);
        setRunning(false); setDone(true);
      }
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, [mode, running]);

  // ── Target tick ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "target" || !running) return;
    intervalRef.current = setInterval(() => {
      const remaining = targetRemaining();
      setDisplay(secsToDisplay(remaining));
      if (remaining === 0) {
        clearInterval(intervalRef.current);
        setRunning(false); setDone(true);
      }
    }, 200);
    return () => clearInterval(intervalRef.current);
  }, [mode, running, targetDate]);

  // Update target preview when date changes (not running)
  useEffect(() => {
    if (mode !== "target" || running) return;
    setDisplay(secsToDisplay(targetRemaining()));
  }, [targetDate]);

  // Update timer preview when duration inputs change (not running)
  useEffect(() => {
    if (mode !== "timer" || running) return;
    timerRemRef.current = timerTotalSecs();
    setDisplay(secsToDisplay(timerRemRef.current));
  }, [timerDays, timerHours, timerMins, timerSecs]);

  // ── Controls ─────────────────────────────────────────────────────────────
  function handleStart() {
    setDone(false);
    if (mode === "stopwatch") {
      swStartRef.current = Date.now();
    } else if (mode === "timer") {
      timerStartRef.current = Date.now();
    }
    setRunning(true);
  }
  function handlePause() {
    clearInterval(intervalRef.current);
    if (mode === "stopwatch") {
      swElapsedRef.current += Date.now() - swStartRef.current;
    } else if (mode === "timer") {
      timerRemRef.current = Math.max(0,
        timerRemRef.current - Math.floor((Date.now() - timerStartRef.current) / 1000));
    }
    setRunning(false);
  }
  function handleReset() {
    clearInterval(intervalRef.current);
    setRunning(false); setDone(false);
    if (mode === "stopwatch") {
      swElapsedRef.current = 0;
      setDisplay(secsToDisplay(0));
    } else if (mode === "timer") {
      timerRemRef.current = timerTotalSecs();
      setDisplay(secsToDisplay(timerRemRef.current));
    } else if (mode === "target") {
      setDisplay(secsToDisplay(targetRemaining()));
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at 50% 20%, #141a2e 0%, #080810 55%, #000 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 20px", gap: 36,
      fontFamily: "'Oswald', sans-serif", color: "#fff",
    }}>

      {/* Top: title + chassis */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <div style={{
          fontSize: 10, letterSpacing: 7, marginBottom: 38,
          color: "rgba(255,255,255,0.22)", textTransform: "uppercase",
        }}>Flip Clock</div>

        <div className="flip-chassis" style={{
          position: "relative",
          background: "linear-gradient(160deg, #2e2e2e 0%, #1b1b1b 45%, #222 75%, #161616 100%)",
          opacity: opacity / 100,
          borderRadius: "clamp(12px, 2vw, 20px)",
          padding: "var(--chassis-pad)",
          display: "flex", alignItems: "center", gap: "var(--group-gap)",
          flexWrap: "nowrap", justifyContent: "center",
          overflowX: "auto",
          width: "100%",
          boxShadow: [
            "0 60px 120px rgba(0,0,0,0.97)",
            "0 24px 48px rgba(0,0,0,0.85)",
            "inset 0 1px 0 rgba(255,255,255,0.11)",
            "inset 0 -2px 0 rgba(0,0,0,0.9)",
            "inset 1px 0 0 rgba(255,255,255,0.05)",
            "inset -1px 0 0 rgba(0,0,0,0.5)",
          ].join(","),
          border: "1px solid rgba(255,255,255,0.055)",
        }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: 20, pointerEvents: "none",
            background: "repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(255,255,255,0.01) 3px, rgba(255,255,255,0.01) 4px)",
          }} />
          <div style={{
            position: "absolute", inset: 0, borderRadius: 20, pointerEvents: "none",
            background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 30%)",
          }} />

          {showYears  && <><FlipGroup value={display.YY}  font={font} color={effectiveColor} label="Anos"     useGradient={useGradient} gradientColor={gradientColor} /><Separator /></>}
          {showMonths && <><FlipGroup value={display.MM}  font={font} color={effectiveColor} label="Meses"    useGradient={useGradient} gradientColor={gradientColor} /><Separator /></>}
          <FlipGroup value={display.DD}  font={font} color={effectiveColor} label="Dias"     useGradient={useGradient} gradientColor={gradientColor} />
          <Separator />
          <FlipGroup value={display.HH}  font={font} color={effectiveColor} label="Horas"    useGradient={useGradient} gradientColor={gradientColor} />
          <Separator />
          <FlipGroup value={display.min} font={font} color={effectiveColor} label="Minutos"  useGradient={useGradient} gradientColor={gradientColor} />
          <Separator />
          <FlipGroup value={display.SS}  font={font} color={effectiveColor} label="Segundos" useGradient={useGradient} gradientColor={gradientColor} />
        </div>

        {done && (
          <div style={{
            marginTop: 24, fontSize: 18, letterSpacing: 4,
            color: "#FF5540", animation: "pulse 0.7s infinite alternate",
            fontFamily: "'Oswald', sans-serif",
          }}>⏱ TEMPO ESGOTADO</div>
        )}
      </div>

      {/* Bottom: controls */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 22,
        background: "rgba(255,255,255,0.022)", borderRadius: 16,
        padding: "28px 32px",
        border: "1px solid rgba(255,255,255,0.055)",
        width: "100%", maxWidth: 640,
      }}>
        <Row label="Modo">
          {[
            { id: "clock",     label: "Relógio"    },
            { id: "stopwatch", label: "Cronômetro" },
            { id: "timer",     label: "Timer"      },
            { id: "target",    label: "Data Alvo"  },
          ].map(({ id, label }) => (
            <button key={id}
              onClick={() => setMode(id)}
              style={{
                background: mode === id ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.04)",
                color: mode === id ? "#fff" : "rgba(255,255,255,0.36)",
                border: `1px solid ${mode === id ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.07)"}`,
                padding: "8px 18px", fontSize: 11, letterSpacing: 2,
              }}>
              {label}
            </button>
          ))}
        </Row>

        <Row label="Exibir">
          {[
            { label: "Anos (AA)",  val: showYears,  set: setShowYears  },
            { label: "Meses (MM)", val: showMonths, set: setShowMonths },
          ].map(({ label, val, set }) => (
            <label key={label} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "rgba(255,255,255,0.52)" }}>
              <input type="checkbox" checked={val} onChange={e => set(e.target.checked)}
                style={{ accentColor: "#888", width: 16, height: 16 }} />
              {label}
            </label>
          ))}
        </Row>

        <Row label="Fonte">
          <select value={font} onChange={e => setFont(e.target.value)}>
            {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </Row>

        <Row label="Cor">
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
        </Row>

        <Row label="Opacidade">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="range" min={10} max={100} value={opacity}
              onChange={e => setOpacity(Number(e.target.value))}
              style={{ width: 140, accentColor: "#888" }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", minWidth: 36 }}>{opacity}%</span>
          </div>
        </Row>

        <Row label="Gradiente">
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
        </Row>

        {/* Timer: duration inputs */}
        {mode === "timer" && (
          <Row label="Duração">
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              {[
                { label: "Dias",  val: timerDays,  set: setTimerDays  },
                { label: "Horas", val: timerHours, set: setTimerHours },
                { label: "Min",   val: timerMins,  set: setTimerMins  },
                { label: "Seg",   val: timerSecs,  set: setTimerSecs  },
              ].map(({ label, val, set }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 9, letterSpacing: 2, color: "rgba(255,255,255,0.33)", textTransform: "uppercase" }}>{label}</span>
                  <input type="number" min={0} max={99} value={val}
                    onChange={e => set(Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={running}
                    style={{ background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: 6, padding: "4px 8px", width: 64, textAlign: "center", fontSize: 14 }}
                  />
                </div>
              ))}
            </div>
          </Row>
        )}

        {/* Target: datetime picker */}
        {mode === "target" && (
          <Row label="Data alvo">
            <input
              type="datetime-local"
              value={targetDate}
              onChange={e => { setTargetDate(e.target.value); setRunning(false); setDone(false); }}
              disabled={running}
              style={{
                background: "#1a1a1a", border: "1px solid #333", color: "#fff",
                borderRadius: 6, padding: "6px 10px", fontSize: 13, cursor: "pointer",
                colorScheme: "dark",
              }}
            />
          </Row>
        )}

        {/* Play / Pause / Reset controls (all modes except clock) */}
        {mode !== "clock" && (
          <div style={{ display: "flex", gap: 10 }}>
            {!running
              ? <button onClick={handleStart} style={{ background: "rgba(255,255,255,0.10)", color: "#fff", border: "1px solid rgba(255,255,255,0.16)", letterSpacing: 2 }}>▶ INICIAR</button>
              : <button onClick={handlePause} style={{ background: "rgba(255,120,80,0.14)", color: "#ff9977", border: "1px solid rgba(255,120,80,0.24)", letterSpacing: 2 }}>⏸ PAUSAR</button>
            }
            {mode !== "stopwatch" && (
              <button onClick={handleReset} style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.38)", border: "1px solid rgba(255,255,255,0.07)", letterSpacing: 2 }}>↺ RESET</button>
            )}
            {mode === "stopwatch" && (
              <button onClick={handleReset} style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.38)", border: "1px solid rgba(255,255,255,0.07)", letterSpacing: 2 }}>↺ ZERAR</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
