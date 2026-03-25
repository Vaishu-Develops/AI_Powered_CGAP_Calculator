'use client';

import { useState, useEffect, useRef } from 'react';
import { FiEdit3 } from 'react-icons/fi';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const DEMO = [
    { subject_code: 'CS8601', grade: 'O',  credits: 3 },
    { subject_code: 'CS8602', grade: 'A+', credits: 3 },
    { subject_code: 'CS8603', grade: 'A',  credits: 3 },
    { subject_code: 'CS8604', grade: 'B+', credits: 3 },
    { subject_code: 'CS8651', grade: 'O',  credits: 2 },
    { subject_code: 'CS8691', grade: 'U',  credits: 2 },
    { subject_code: 'HS8581', grade: 'A+', credits: 3 },
    { subject_code: 'MA8551', grade: 'O',  credits: 4 },
];

/* ─── props ──────────────────────────────────────────────────────────────── */
interface OcrScanScreenProps {
    imageUrl: string | null;
    currentFile: number;
    totalFiles: number;
    statusMsg: string;
    ocrData?: any;
    onComplete?: () => void;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ───────────────────────────────────────────────────────────────────────────
   1. Pencil loops continuously: draw left→right, erase, repeat.
   2. Row counter advances each cycle — "Reading row 3 — CS8603" text types in.
   3. When OCR data arrives, remaining rows are processed then onComplete fires.
   4. No table. Just the pencil + typewriter text.
═══════════════════════════════════════════════════════════════════════════ */
export default function OcrScanScreen({
    imageUrl, currentFile, totalFiles, statusMsg, ocrData, onComplete,
}: OcrScanScreenProps) {

    // rAF-driven draw progress 0→1
    const [drawPct, setDrawPct]     = useState(0);
    // true while the erase phase runs
    const [erasing, setErasing]     = useState(false);
    // which row index the pencil is currently on
    const [rowIndex, setRowIndex]   = useState(0);
    // typewriter display text
    const [typeText, setTypeText]   = useState('');

    const subjects   = ocrData?.subjects?.length > 0 ? ocrData.subjects : DEMO;
    const totalRows  = subjects.length;

    const rafRef       = useRef<number | null>(null);
    const timers       = useRef<ReturnType<typeof setTimeout>[]>([]);
    const rowRef       = useRef(0);           // mutable mirror of rowIndex for closures
    const doneRef      = useRef(false);       // have we fired onComplete?
    const ocrReadyRef  = useRef(false);       // ocrData has arrived
    const typeTimers   = useRef<ReturnType<typeof setTimeout>[]>([]);
    const lastRafCommitRef = useRef(0);
    const lastTypeLabelRef = useRef('');

    /* ── typewriter ── */
    const typeWrite = (text: string) => {
        if (lastTypeLabelRef.current === text) return;
        lastTypeLabelRef.current = text;
        typeTimers.current.forEach(clearTimeout);
        typeTimers.current = [];
        setTypeText('');
        let i = 0;
        const tick = () => {
            i++;
            setTypeText(text.slice(0, i));
            if (i < text.length) {
                // Slightly slower cadence reduces re-render pressure during dev hot reload.
                const t = setTimeout(tick, 55);
                typeTimers.current.push(t);
            }
        };
        tick();
    };

    const addTimer = (fn: () => void, ms: number) => {
        const t = setTimeout(fn, ms);
        timers.current.push(t);
    };

    /* ── one draw-erase cycle ── */
    const runCycle = () => {
        const DRAW_MS  = 1100;
        const ERASE_MS = 320;
        const GAP_MS   = 100;

        setErasing(false);

        const start = performance.now();
        const raf = (now: number) => {
            // Throttle commits to ~30fps to avoid excessive state updates.
            if (now - lastRafCommitRef.current < 33) {
                rafRef.current = requestAnimationFrame(raf);
                return;
            }
            lastRafCommitRef.current = now;

            const p = Math.min((now - start) / DRAW_MS, 1);
            setDrawPct(p);
            if (p < 1) {
                rafRef.current = requestAnimationFrame(raf);
            } else {
                /* stroke done — erase then advance */
                addTimer(() => {
                    setErasing(true);
                    addTimer(() => {
                        const nextRow = rowRef.current + 1;
                        rowRef.current = nextRow;
                        setRowIndex(nextRow);
                        setDrawPct(0);

                        /* if ocrData has arrived and we've cycled through all rows → done */
                        if (ocrReadyRef.current && nextRow >= totalRows && !doneRef.current) {
                            doneRef.current = true;
                            addTimer(() => { if (onComplete) onComplete(); }, 400);
                            return;
                        }
                        /* otherwise keep looping */
                        addTimer(() => runCycle(), GAP_MS);
                    }, ERASE_MS);
                }, 180);
            }
        };
        rafRef.current = requestAnimationFrame(raf);
    };

    /* ── start loop immediately (no waiting for ocrData) ── */
    useEffect(() => {
        runCycle();
        return () => {
            timers.current.forEach(clearTimeout);
            typeTimers.current.forEach(clearTimeout);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── mark ocrData ready when it arrives ── */
    useEffect(() => {
        if (ocrData) ocrReadyRef.current = true;
    }, [ocrData]);

    /* ── update typewriter whenever rowIndex changes ── */
    useEffect(() => {
        const idx   = rowIndex % totalRows;
        const subj  = subjects[idx];
        const code  = subj?.subject_code || subj?.code || '';
        const label = code
            ? `Reading row ${rowIndex + 1} — ${code}`
            : `Scanning row ${rowIndex + 1}…`;
        typeWrite(label);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rowIndex, totalRows]);

    /* ── derived pencil position ── */
    const pencilX = erasing ? 0  : drawPct * 100;
    const pencilY = erasing ? 0  : Math.sin(drawPct * Math.PI * 12) * 10;
    const fillPct = erasing ? 0  : drawPct * 100;

    /* ══════════════════════════════════════════════ RENDER ═══════════════ */
    return (
        <div style={{
            maxWidth: 720, margin: '0 auto', padding: '0 20px',
            display: 'flex', flexDirection: 'column', gap: 20,
            minHeight: '60vh', justifyContent: 'center',
        }}>

            {/* file counter badge — only shown when multi-file */}
            {totalFiles > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{
                        fontSize: 11, fontWeight: 800, fontFamily: 'Outfit', color: '#D4500A',
                        background: 'rgba(212,80,10,0.08)', border: '1px solid rgba(212,80,10,0.15)',
                        borderRadius: 999, padding: '4px 14px',
                    }}>
                        File {currentFile} / {totalFiles}
                    </span>
                </div>
            )}

            {/* ══════════════════════════════════════════
                  PENCIL CARD
              ══════════════════════════════════════════ */}
            <div style={{
                background: '#FFFAF5',
                border: '1.5px solid #FDE8D8',
                borderRadius: 28,
                padding: '48px 44px 52px',
                boxShadow: '0 4px 40px rgba(212,80,10,0.07)',
                position: 'relative', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', gap: 36,
            }}>

                {/* faint ruled-paper lines */}
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} style={{
                        position: 'absolute',
                        left: 44, right: 44,
                        top: `${80 + i * 52}px`,
                        height: 1,
                        background: 'rgba(212,80,10,0.045)',
                    }} />
                ))}

                {/* dot grid */}
                <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    backgroundImage: 'radial-gradient(rgba(212,80,10,0.03) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                }} />

                {/* ── typewriter label ── */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <span style={{
                        fontSize: 22, fontWeight: 800,
                        fontFamily: 'Outfit, sans-serif',
                        color: '#1A1A2E', letterSpacing: '-0.01em',
                    }}>
                        {typeText}
                    </span>
                    {/* blinking cursor */}
                    <span style={{
                        display: 'inline-block', width: 2, height: '1em',
                        background: '#D4500A', marginLeft: 3, verticalAlign: 'text-bottom',
                        animation: 'blink-cursor 1s step-end infinite',
                    }} />
                </div>

                {/* ── pencil stroke track ── */}
                <div style={{ position: 'relative', height: 56, zIndex: 1 }}>

                    {/* guide line */}
                    <div style={{
                        position: 'absolute', left: 0, right: 0, top: '50%',
                        transform: 'translateY(-50%)',
                        height: 2, borderRadius: 99,
                        background: 'rgba(212,80,10,0.08)',
                    }} />

                    {/* ink fill */}
                    <div style={{
                        position: 'absolute', left: 0, bottom: '50%', marginBottom: -1,
                        height: 3, borderRadius: 99,
                        background: 'linear-gradient(to right, #D4500A, #FB923C)',
                        boxShadow: '0 0 7px 1px rgba(212,80,10,0.4)',
                        width: `${fillPct}%`,
                        transition: erasing
                            ? 'width 0.3s cubic-bezier(0.4,0,1,1)'
                            : 'none',
                    }} />

                    {/* pencil icon */}
                    <div style={{
                        position: 'absolute',
                        left: `${pencilX}%`,
                        top: `calc(50% + ${pencilY}px)`,
                        transform: `translate(-50%, -50%) rotate(-40deg) scale(${erasing ? 0.65 : 1})`,
                        color: '#D4500A',
                        filter: 'drop-shadow(0 0 6px rgba(212,80,10,0.6))',
                        display: 'flex',
                        transition: erasing ? 'transform 0.2s ease, top 0.15s ease' : 'none',
                    }}>
                        <FiEdit3 size={22} />
                    </div>

                    {/* graphite-dust sparkles at the tip */}
                    {!erasing && drawPct > 0.04 && drawPct < 0.97 && [0, 1, 2].map(i => (
                        <span
                            key={i}
                            style={{
                                position: 'absolute',
                                left: `${pencilX}%`,
                                top: `calc(50% + ${pencilY}px)`,
                                width: 3, height: 3,
                                borderRadius: '50%',
                                background: '#D4500A',
                                animation: `dust-${i} 0.5s ease-out infinite`,
                                animationDelay: `${i * 0.13}s`,
                                pointerEvents: 'none',
                            }}
                        />
                    ))}
                </div>

                {/* row progress dots */}
                <div style={{
                    display: 'flex', gap: 6, flexWrap: 'wrap',
                    position: 'relative', zIndex: 1,
                }}>
                    {Array.from({ length: totalRows }).map((_, i) => {
                        const done = i < (rowIndex % totalRows);
                        const active = i === (rowIndex % totalRows);
                        return (
                            <div key={i} style={{
                                width: active ? 24 : 8,
                                height: 8, borderRadius: 99,
                                background: done
                                    ? '#D4500A'
                                    : active
                                        ? '#FB923C'
                                        : 'rgba(212,80,10,0.15)',
                                transition: 'width 0.3s ease, background 0.3s ease',
                                boxShadow: active ? '0 0 8px rgba(212,80,10,0.5)' : 'none',
                            }} />
                        );
                    })}
                </div>

            </div>

            {/* keyframe styles — injected once */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to   { transform: rotate(360deg); }
                }
                @keyframes pulse-dot {
                    from { opacity: 1; }
                    to   { opacity: 0.2; }
                }
                @keyframes blink-cursor {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0; }
                }
            `}</style>
        </div>
    );
}
