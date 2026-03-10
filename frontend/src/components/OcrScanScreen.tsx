'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCpu, FiAlertTriangle } from 'react-icons/fi';

// ─── Data ─────────────────────────────────────────────────────────────────────
const DEMO = [
    { code: 'CS8601', grade: 'O', cr: 3, conf: 'high' as const },
    { code: 'CS8602', grade: 'A+', cr: 3, conf: 'high' as const },
    { code: 'CS8603', grade: 'A', cr: 3, conf: 'low' as const },
    { code: 'CS8604', grade: 'B+', cr: 3, conf: 'high' as const },
    { code: 'CS8651', grade: 'O', cr: 2, conf: 'high' as const },
    { code: 'CS8691', grade: '?', cr: 2, conf: 'fail' as const },
    { code: 'HS8581', grade: 'A+', cr: 3, conf: 'high' as const },
    { code: 'MA8551', grade: 'O', cr: 4, conf: 'high' as const },
    { code: 'GE8561', grade: 'A+', cr: 1, conf: 'high' as const },
    { code: 'CS8611', grade: 'B+', cr: 2, conf: 'high' as const },
];

const GP: Record<string, number> = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'U': 0, '?': 0 };
const GCLR: Record<string, string> = {
    'O': '#D4500A', 'A+': '#7C3AED', 'A': '#D97706', 'B+': '#0EA5E9',
    'B': '#14B8A6', 'C': '#F97316', 'U': '#EF4444', '?': '#F59E0B',
};

// Scatter positions — deliberately spread across the full container
const SCATTER = [
    { x: 5, y: 6, r: -7 },
    { x: 70, y: 4, r: 5 },
    { x: 33, y: 3, r: -12 },
    { x: 86, y: 10, r: 8 },
    { x: 14, y: 18, r: 4 },
    { x: 53, y: 12, r: -6 },
    { x: 76, y: 22, r: 10 },
    { x: 2, y: 28, r: -9 },
    { x: 40, y: 24, r: 7 },
    { x: 60, y: 28, r: -4 },
];

const COPY = [
    "Scanning document...",
    "Subject codes detected.",
    "Pulling subjects into position...",
    "Reading grade data...",
    "Credits confirmed.",
    "Snapping next subject...",
    "Almost there...",
    "Final subjects locking in...",
    "All subjects extracted!",
];

interface OcrScanScreenProps {
    imageUrl: string | null;
    currentFile: number;
    totalFiles: number;
    statusMsg: string;
}

type Phase = 'floating' | 'pulling' | 'snapped';

// ─── Grade Pill ───────────────────────────────────────────────────────────────
function Pill({ grade }: { grade: string }) {
    const c = GCLR[grade] || '#D4500A';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 9px', borderRadius: 6,
            background: c + '15', border: `1px solid ${c}35`,
            fontSize: 12, fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: c,
        }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
            {grade}
        </span>
    );
}

// ─── Odometer ─────────────────────────────────────────────────────────────────
function Odo({ ch }: { ch: string }) {
    return (
        <span style={{ display: 'inline-block', overflow: 'hidden', height: '1.05em', verticalAlign: 'bottom' }}>
            <AnimatePresence mode="popLayout">
                <motion.span key={ch} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    style={{ display: 'inline-block' }}>{ch}</motion.span>
            </AnimatePresence>
        </span>
    );
}

// ─── Single floating chip ─────────────────────────────────────────────────────
function FloatingChip({ subj, idx, phase }: {
    subj: typeof DEMO[0]; idx: number; phase: Phase;
}) {
    const sc = SCATTER[idx];
    const isWarn = subj.conf !== 'high';

    // Each chip gets unique bob timing so they feel organic
    const bobDuration = 2.5 + (idx % 3) * 0.5;
    const bobY = 6 + (idx % 4) * 2;
    const bobX = 3 + (idx % 3) * 1.5;

    // Target position when pulled — toward the table at the bottom center
    const tableTargetY = 56 + idx * 3.6;

    if (phase === 'snapped') {
        // Fading ghost at original position
        return (
            <motion.div
                key={`ghost-${subj.code}`}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                    position: 'absolute', left: `${sc.x}%`, top: `${sc.y}%`,
                    transform: `rotate(${sc.r}deg)`, zIndex: 1, pointerEvents: 'none',
                }}
            >
                <span style={{
                    fontSize: 15, fontWeight: 800, fontFamily: 'Outfit',
                    color: 'rgba(212,80,10,0.1)', letterSpacing: '0.06em',
                }}>{subj.code}</span>
            </motion.div>
        );
    }

    if (phase === 'pulling') {
        // Flying toward the table row
        return (
            <motion.div
                key={`pull-${subj.code}`}
                initial={{
                    left: `${sc.x}%`, top: `${sc.y}%`, rotate: sc.r, scale: 1,
                }}
                animate={{
                    left: '50%', top: `${tableTargetY}%`,
                    rotate: 0, scale: 0.85, opacity: [1, 1, 0.3],
                }}
                transition={{
                    type: 'spring', stiffness: 120, damping: 14, mass: 0.8,
                }}
                style={{
                    position: 'absolute', zIndex: 25, pointerEvents: 'none',
                    transform: 'translate(-50%, -50%)',
                }}
            >
                <div style={{
                    background: '#FFF', border: `1.5px solid rgba(212,80,10,0.3)`,
                    borderRadius: 10, padding: '5px 13px',
                    display: 'flex', alignItems: 'center', gap: 7,
                    boxShadow: '0 8px 30px rgba(212,80,10,0.2)',
                }}>
                    <span style={{
                        fontSize: 15, fontWeight: 800, letterSpacing: '0.05em',
                        fontFamily: 'Outfit', color: '#D4500A'
                    }}>{subj.code}</span>
                </div>
                {/* Trail streak */}
                <motion.div
                    initial={{ width: 0, opacity: 0.5 }}
                    animate={{ width: 80, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                        position: 'absolute', right: '100%', top: '40%', height: 2,
                        background: 'linear-gradient(to left, rgba(212,80,10,0.3), transparent)',
                        borderRadius: 2,
                    }}
                />
            </motion.div>
        );
    }

    // Floating — continuous gentle bob
    return (
        <motion.div
            key={subj.code}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
                opacity: 1, scale: 1,
                x: [0, bobX, -bobX, 0],
                y: [0, -bobY, bobY * 0.5, 0],
                rotate: [sc.r, sc.r + 3, sc.r - 2, sc.r],
            }}
            transition={{
                opacity: { duration: 0.5, delay: idx * 0.12 },
                scale: { duration: 0.4, delay: idx * 0.12 },
                x: { repeat: Infinity, duration: bobDuration, ease: 'easeInOut' },
                y: { repeat: Infinity, duration: bobDuration * 1.1, ease: 'easeInOut' },
                rotate: { repeat: Infinity, duration: bobDuration * 1.3, ease: 'easeInOut' },
            }}
            style={{
                position: 'absolute',
                left: `${sc.x}%`, top: `${sc.y}%`,
                zIndex: 10, cursor: 'default',
            }}
        >
            <motion.div
                whileHover={{ scale: 1.08 }}
                style={{
                    background: isWarn ? 'rgba(245,158,11,0.07)' : '#FFFFFF',
                    border: `1.5px solid ${isWarn ? 'rgba(245,158,11,0.3)' : 'rgba(212,80,10,0.18)'}`,
                    borderRadius: 10, padding: '5px 13px',
                    display: 'flex', alignItems: 'center', gap: 7,
                    boxShadow: '0 2px 10px rgba(212,80,10,0.08)',
                }}
            >
                <span style={{
                    fontSize: 15, fontWeight: 800, letterSpacing: '0.05em',
                    fontFamily: 'Outfit, sans-serif',
                    color: isWarn ? '#D97706' : '#D4500A',
                }}>{subj.code}</span>
                {isWarn && <FiAlertTriangle style={{ width: 11, height: 11, color: '#F59E0B' }} />}
            </motion.div>
        </motion.div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function OcrScanScreen({ imageUrl, currentFile, totalFiles, statusMsg }: OcrScanScreenProps) {
    const [phases, setPhases] = useState<Phase[]>(() => DEMO.map(() => 'floating'));
    const [gpa, setGpa] = useState('—');
    const [snapCount, setSnapCount] = useState(0);
    const [copyIdx, setCopyIdx] = useState(0);
    const [copyText, setCopyText] = useState('');
    const copyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Ref-based chain guard for strict mode safety
    const chainTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const chainStarted = useRef(false);

    // Typewriter
    useEffect(() => {
        let ci = 0;
        const t = COPY[copyIdx % COPY.length];
        setCopyText('');
        const iv = setInterval(() => {
            ci++; setCopyText(t.slice(0, ci));
            if (ci >= t.length) { clearInterval(iv); copyRef.current = setTimeout(() => setCopyIdx(p => p + 1), 2200); }
        }, 28);
        return () => { clearInterval(iv); if (copyRef.current) clearTimeout(copyRef.current); };
    }, [copyIdx]);

    // GPA recalc
    useEffect(() => {
        const snapped = DEMO.filter((_, i) => phases[i] === 'snapped');
        if (!snapped.length) return;
        const tw = snapped.reduce((a, s) => a + (GP[s.grade] || 0) * s.cr, 0);
        const tc = snapped.reduce((a, s) => a + s.cr, 0);
        if (tc > 0) setGpa((tw / tc).toFixed(2));
    }, [snapCount, phases]);

    // Pull chain — guarded against double mount
    useEffect(() => {
        if (chainStarted.current) return;
        chainStarted.current = true;

        const pullSubject = (idx: number) => {
            if (idx >= DEMO.length) return;
            // Start pulling
            const t1 = setTimeout(() => {
                setPhases(p => p.map((ph, i) => i === idx ? 'pulling' : ph));
                // Snap after flight
                const t2 = setTimeout(() => {
                    setPhases(p => p.map((ph, i) => i === idx ? 'snapped' : ph));
                    setSnapCount(c => c + 1);
                    // Next subject
                    const t3 = setTimeout(() => pullSubject(idx + 1), 700);
                    chainTimers.current.push(t3);
                }, 600);
                chainTimers.current.push(t2);
            }, idx === 0 ? 2000 : 0);
            chainTimers.current.push(t1);
        };

        pullSubject(0);

        return () => {
            chainTimers.current.forEach(clearTimeout);
            chainTimers.current = [];
        };
    }, []);

    return (
        <div style={{
            minHeight: '85vh', position: 'relative', maxWidth: 900,
            margin: '0 auto', padding: '0 20px',
            display: 'flex', flexDirection: 'column',
        }}>

            {/* ── Status strip ── */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 18px', marginBottom: 16,
                background: '#FFF', border: '1.5px solid #FDE8D8',
                borderRadius: 14, boxShadow: '0 2px 12px rgba(212,80,10,0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                        style={{ display: 'flex', color: '#D4500A' }}><FiCpu size={18} /></motion.div>
                    <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Outfit, sans-serif', color: '#0F0A00' }}>
                        {statusMsg || 'Saffron Engine — Magnetic Pull'}
                    </span>
                    <motion.span animate={{ opacity: [1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8 }}
                        style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4500A' }} />
                </div>
                {totalFiles > 1 && (
                    <span style={{
                        fontSize: 11, fontWeight: 800, fontFamily: 'Outfit', color: '#D4500A',
                        background: 'rgba(212,80,10,0.08)', borderRadius: 999, padding: '3px 12px'
                    }}>
                        File {currentFile}/{totalFiles}
                    </span>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                 THE ARENA — one single container
            ══════════════════════════════════════════════════════════════════ */}
            <div style={{
                flex: 1, position: 'relative',
                background: '#FFFAF5', border: '1.5px solid #FDE8D8',
                borderRadius: 28, overflow: 'hidden',
                boxShadow: '0 4px 30px rgba(212,80,10,0.06)',
                minHeight: 540,
            }}>
                {/* Dot grid */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(rgba(212,80,10,0.04) 1px, transparent 1px)',
                    backgroundSize: '28px 28px', zIndex: 0,
                }} />

                {/* ── Floating / Pulling / Ghost chips ── */}
                {DEMO.map((subj, idx) => (
                    <FloatingChip key={`chip-${idx}`} subj={subj} idx={idx} phase={phases[idx]} />
                ))}

                {/* Counter - top right */}
                <div style={{
                    position: 'absolute', top: 14, right: 14, zIndex: 30,
                    background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
                    borderRadius: 8, padding: '5px 12px',
                    border: '1px solid #FDE8D8', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Outfit', color: '#78716C' }}>
                        {DEMO.length - snapCount} floating
                    </span>
                    <span style={{ width: 1, height: 14, background: '#FDE8D8' }} />
                    <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'Outfit', color: '#059669' }}>
                        {snapCount} snapped
                    </span>
                </div>

                {/* ── Table anchored at bottom of the arena ── */}
                <div style={{
                    position: 'absolute', left: '4%', right: '4%', bottom: 14, zIndex: 30,
                    background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)',
                    border: '1.5px solid #FDE8D8', borderRadius: 20,
                    boxShadow: '0 -4px 30px rgba(212,80,10,0.06)',
                    overflow: 'hidden',
                }}>
                    {/* Table header */}
                    <div style={{
                        padding: '10px 18px', borderBottom: '1px solid #FDE8D8',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#FFF8F2',
                    }}>
                        <span style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
                            textTransform: 'uppercase', color: '#D4500A', fontFamily: 'Outfit'
                        }}>
                            ● EXTRACTION TABLE
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Outfit', color: '#A8A29E' }}>
                            {snapCount} / {DEMO.length}
                        </span>
                    </div>

                    {/* Column labels */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1.8rem 1fr auto auto auto',
                        gap: '0 10px', padding: '7px 18px',
                        borderBottom: '1px solid rgba(253,232,216,0.6)',
                    }}>
                        {['#', 'Subject', 'Grade', 'Cr', 'Pts'].map(h => (
                            <span key={h} style={{
                                fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
                                textTransform: 'uppercase', color: '#C8C4C0', fontFamily: 'Outfit'
                            }}>{h}</span>
                        ))}
                    </div>

                    {/* Rows */}
                    <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                        {DEMO.map((subj, idx) => {
                            const isSnapped = phases[idx] === 'snapped';
                            const w = (GP[subj.grade] || 0) * subj.cr;
                            const isWarn = subj.conf !== 'high';
                            return (
                                <div key={`r-${subj.code}`}>
                                    {isSnapped ? (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{
                                                height: 'auto', opacity: 1,
                                                backgroundColor: ['rgba(212,80,10,0.12)', 'rgba(212,80,10,0.02)', 'transparent'],
                                            }}
                                            transition={{
                                                height: { type: 'spring', stiffness: 700, damping: 28 },
                                                opacity: { duration: 0.1 },
                                                backgroundColor: { duration: 0.7, times: [0, 0.35, 1] },
                                            }}
                                            style={{
                                                display: 'grid', gridTemplateColumns: '1.8rem 1fr auto auto auto',
                                                gap: '0 10px', padding: '9px 18px',
                                                borderBottom: '1px solid rgba(253,232,216,0.5)',
                                                alignItems: 'center', transformOrigin: 'top',
                                                borderLeft: isWarn ? `3px solid ${subj.conf === 'fail' ? '#EF444470' : '#F59E0B70'}` : '3px solid transparent',
                                            }}>
                                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                style={{ fontSize: 11, fontWeight: 700, color: '#A8A29E', fontFamily: 'Outfit' }}>{idx + 1}</motion.span>
                                            <motion.span initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 }}
                                                style={{ fontSize: 13, fontWeight: 800, color: '#1A1A2E', fontFamily: 'Outfit', letterSpacing: '0.03em' }}>
                                                {subj.code}
                                                {isWarn && <FiAlertTriangle style={{
                                                    marginLeft: 5, width: 11, height: 11,
                                                    color: subj.conf === 'fail' ? '#EF4444' : '#F59E0B', verticalAlign: 'middle'
                                                }} />}
                                            </motion.span>
                                            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.08, type: 'spring', stiffness: 400, damping: 20 }}>
                                                <Pill grade={subj.grade} />
                                            </motion.div>
                                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}
                                                style={{ fontSize: 12, fontWeight: 700, color: '#78716C', fontFamily: 'Outfit', textAlign: 'right' }}>{subj.cr}</motion.span>
                                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.16 }}
                                                style={{
                                                    fontSize: 12, fontWeight: 700, fontFamily: 'Outfit', textAlign: 'right',
                                                    color: w === 0 && subj.grade === '?' ? '#D1D5DB' : '#D4500A'
                                                }}>
                                                {w === 0 && subj.grade === '?' ? '—' : w}
                                            </motion.span>
                                        </motion.div>
                                    ) : (
                                        <div style={{
                                            display: 'grid', gridTemplateColumns: '1.8rem 1fr auto auto auto',
                                            gap: '0 10px', padding: '9px 18px',
                                            borderBottom: '1px dashed rgba(253,232,216,0.4)',
                                            alignItems: 'center', minHeight: 36,
                                            borderLeft: '3px solid transparent',
                                        }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: '#E7E5E4', fontFamily: 'Outfit' }}>{idx + 1}</span>
                                            <span style={{ fontSize: 12, color: '#E7E5E4', letterSpacing: '0.15em' }}>· · · · · ·</span>
                                            <span style={{ color: '#E7E5E4' }}>—</span>
                                            <span style={{ color: '#E7E5E4' }}>—</span>
                                            <span style={{ color: '#E7E5E4' }}>—</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Bottom bar: GPA + micro-copy ── */}
            <div style={{ display: 'flex', gap: 14, marginTop: 16 }}>
                {/* GPA */}
                <div style={{
                    flex: '0 0 220px', background: '#FFF',
                    border: '1.5px solid #FDE8D8', borderRadius: 16,
                    padding: '12px 18px', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 12px rgba(212,80,10,0.05)',
                }}>
                    <div>
                        <p style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
                            color: '#A8A29E', fontFamily: 'Outfit', margin: '0 0 2px'
                        }}>GPA</p>
                        <p style={{ fontSize: 10, fontWeight: 500, color: '#A8A29E', fontFamily: 'Outfit', margin: 0 }}>
                            {snapCount} subj.
                        </p>
                    </div>
                    <div style={{
                        fontSize: 32, fontWeight: 900, fontFamily: 'Outfit',
                        color: gpa !== '—' ? '#D4500A' : 'rgba(212,80,10,0.15)',
                        lineHeight: 1, letterSpacing: '-0.03em',
                    }}>
                        {gpa.split('').map((c, i) => <Odo key={`${i}-${c}`} ch={c} />)}
                    </div>
                </div>

                {/* Micro-copy */}
                <div style={{
                    flex: 1, background: 'rgba(212,80,10,0.03)',
                    borderLeft: '3px solid rgba(212,80,10,0.2)',
                    borderRadius: '0 14px 14px 0', padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                }}>
                    <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                        style={{ width: 5, height: 5, borderRadius: '50%', background: '#D4500A', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Outfit', color: '#78716C', fontStyle: 'italic' }}>
                        {copyText}
                        <motion.span animate={{ opacity: [1, 1, 0, 0] }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                            style={{ display: 'inline-block', width: 2, height: 13, background: '#D4500A', marginLeft: 2, verticalAlign: 'middle' }} />
                    </span>
                </div>
            </div>
        </div>
    );
}
