'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiChevronLeft, FiChevronRight,
    FiEdit2, FiCheck, FiX,
    FiPlus, FiTrash2, FiAlertTriangle, FiSkipForward,
    FiSearch,
} from 'react-icons/fi';

/* ─── Types ──────────────────────────────────────────────────────────────── */
export interface PreviewSubject {
    subject_code: string;
    grade: string;
    marks?: number;
    credits?: number;
    is_revaluation?: boolean;
    confidence?: string | number;
    original_semester?: number;
    overridden_by_revaluation?: boolean;
    main_grade?: string;
    revaluation_grade?: string;
    review_required?: boolean;
    cleared_in_semester?: number;
    cleared_badge?: string;
    is_cleared_arrear?: boolean;
}

interface PreviewSectionProps {
    imageUrls: string[];
    ocrData: {
        subjects: PreviewSubject[];
        subjects_per_file?: PreviewSubject[][];
        semester_info?: { semester?: number; regulation?: string };
        confidence?: { overall?: number };
    };
    onConfirm: (editedSubjects: PreviewSubject[]) => void;
    onBack: () => void;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const VALID_GRADES = ['O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'RA', 'SA', 'W', '-'];

const GP: Record<string, number> = {
    'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'U': 0, 'RA': 0, 'SA': 0, 'W': 0,
};

const GRADE_COLOR: Record<string, string> = {
    'O': '#059669', 'A+': '#7C3AED', 'A': '#D97706',
    'B+': '#0EA5E9', 'B': '#14B8A6', 'C': '#6B7280',
    'U': '#EF4444', 'RA': '#EF4444', 'SA': '#F59E0B', 'W': '#9CA3AF',
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function calcGPA(subjects: PreviewSubject[]) {
    const passing = subjects.filter(s => !['U', 'RA', 'SA', 'W', '-'].includes(s.grade));
    const tw = passing.reduce((a, s) => a + (GP[s.grade] ?? 0) * (s.credits ?? 0), 0);
    const tc = passing.reduce((a, s) => a + (s.credits ?? 0), 0);
    return tc > 0 ? (tw / tc).toFixed(2) : null;
}

function hasIssues(subjects: PreviewSubject[]) {
    const issues = subjects.some(s =>
        s.review_required ||
        (typeof s.confidence === 'string' && s.confidence === 'low') ||
        (typeof s.confidence === 'number' && s.confidence < 0.7) ||
        !s.grade || s.grade === '?' || !s.subject_code || s.subject_code.trim().length < 3,
    );
    // Debug: Log subjects with potential issues
    const problemSubjects = subjects.filter(s => 
        s.review_required ||
        (typeof s.confidence === 'string' && s.confidence === 'low') ||
        (typeof s.confidence === 'number' && s.confidence < 0.7) ||
        !s.grade || s.grade === '?' || !s.subject_code || s.subject_code.trim().length < 3
    );
    if (problemSubjects.length > 0) {
        console.log('Preview subjects with issues:', problemSubjects.map(s => ({
            code: s.subject_code,
            grade: s.grade,
            confidence: s.confidence,
            codeLength: s.subject_code?.trim().length
        })));
    }
    return issues;
}

function GradePill({ grade }: { grade: string }) {
    const c = GRADE_COLOR[grade] || '#9CA3AF';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            padding: '2px 10px', borderRadius: 6, minWidth: 38,
            background: `${c}18`, border: `1px solid ${c}40`,
            color: c, fontSize: 11, fontWeight: 800, fontFamily: 'Outfit, sans-serif',
            letterSpacing: '0.04em',
        }}>{grade || '—'}</span>
    );
}

/* ─── Single Sem Slide ───────────────────────────────────────────────────── */
function SemSlide({
    imageUrl, subjects, semLabel, direction, onChange,
}: {
    imageUrl: string | null;
    subjects: PreviewSubject[];
    semLabel: string;
    direction: number;
    onChange: (updated: PreviewSubject[]) => void;
}) {
    const [editing, setEditing] = useState<Record<number, { grade: string; subject_code: string; credits: string; points: string }>>({});
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);
    const hasDraggedRef = useRef(false);
    const mouseDownPos = useRef({ x: 0, y: 0 });

    const containerRef = useRef<HTMLDivElement>(null);

    const handleWheel = (e: React.WheelEvent) => {
        const delta = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(scale + delta, 0.4), 4);
        setScale(newScale);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        mouseDownPos.current = { x: e.clientX, y: e.clientY };
        hasDraggedRef.current = false;
        if (scale <= 1) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const dx = Math.abs(e.clientX - mouseDownPos.current.x);
        const dy = Math.abs(e.clientY - mouseDownPos.current.y);
        if (dx > 3 || dy > 3) hasDraggedRef.current = true;

        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => setIsDragging(false);

    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const toggleZoom = () => {
        if (scale !== 1) resetZoom();
        else setScale(2);
    };

    const startEdit = (idx: number, s: PreviewSubject) =>
        setEditing(p => ({
            ...p,
            [idx]: {
                grade: s.grade,
                subject_code: s.subject_code,
                credits: String(s.credits ?? ''),
                points: String((GP[s.grade] ?? 0) * (s.credits ?? 0)),
            }
        }));

    const cancelEdit = (idx: number) =>
        setEditing(p => { const n = { ...p }; delete n[idx]; return n; });

    const saveEdit = (idx: number) => {
        const ed = editing[idx]; if (!ed) return;
        const grade = ed.grade.toUpperCase().trim();
        const gradePoints = GP[grade] ?? 0;

        const enteredCredits = Number(ed.credits);
        const safeCredits = Number.isFinite(enteredCredits) && enteredCredits >= 0 ? enteredCredits : 0;

        const enteredPoints = Number(ed.points);
        const safePoints = Number.isFinite(enteredPoints) && enteredPoints >= 0 ? enteredPoints : 0;

        // If points and credits disagree, treat points as the source of truth.
        // Convert points back to credits so backend calculations remain consistent.
        const derivedPointsFromCredits = safeCredits * gradePoints;
        const credits = gradePoints > 0 && Math.abs(safePoints - derivedPointsFromCredits) > 0.01
            ? Number((safePoints / gradePoints).toFixed(2))
            : safeCredits;

        const updated = subjects.map((s, i) => i === idx
            ? {
                ...s,
                grade,
                subject_code: ed.subject_code.toUpperCase().trim() || s.subject_code,
                credits,
            }
            : s,
        );
        onChange(updated);
        cancelEdit(idx);
    };

    const addRow = () => {
        const newS: PreviewSubject = { subject_code: 'NEW101', grade: 'O', credits: 3 };
        const updated = [...subjects, newS];
        onChange(updated);
        setTimeout(() => startEdit(updated.length - 1, newS), 50);
    };

    const removeRow = (idx: number) => {
        onChange(subjects.filter((_, i) => i !== idx));
        cancelEdit(idx);
    };

    const slideVariants = {
        enter: (d: number) => ({ x: d > 0 ? '60%' : '-60%', opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? '-60%' : '60%', opacity: 0 }),
    };

    return (
        <motion.div
            key={semLabel}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            style={{
                display: 'grid',
                gridTemplateColumns: imageUrl ? '1fr 1.6fr' : '1fr',
                gap: 0,
                minHeight: 0,
                flex: 1,
                background: '#FFFDF9',
                borderRadius: 0,
                overflow: 'hidden',
            }}
        >
            {/* ── Left: Marksheet image ── */}
            {imageUrl && (
                <div style={{
                    borderRight: '1.5px solid #FDE8D8',
                    display: 'flex', flexDirection: 'column',
                    background: '#FFF8F4',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {/* image toolbar */}
                    <div style={{
                        padding: '8px 14px', borderBottom: '1px solid #FDE8D8',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: '#FFF8F2', zIndex: 10,
                    }}>
                        <span style={{
                            fontSize: 10, fontWeight: 800, fontFamily: 'Outfit', color: '#B2A49A',
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                        }}>Document</span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#D4500A', opacity: 0.6, fontFamily: 'Outfit' }}>
                                Scroll to zoom • Drag to pan
                            </span>
                            {scale !== 1 && (
                                <button
                                    onClick={resetZoom}
                                    style={{
                                        padding: '4px 10px', borderRadius: 6, border: '1px solid #FDE8D8',
                                        background: '#FFF', cursor: 'pointer',
                                        fontSize: 10, fontWeight: 800, fontFamily: 'Outfit', color: '#D4500A',
                                    }}
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </div>

                    {/* scrollable image area */}
                    <div
                        ref={containerRef}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={() => { handleMouseUp(); setIsHovered(false); }}
                        onMouseEnter={() => setIsHovered(true)}
                        onClick={(e) => {
                            if (!hasDraggedRef.current) {
                                toggleZoom();
                            }
                        }}
                        style={{
                            flex: 1,
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <motion.img
                            src={imageUrl}
                            alt={semLabel}
                            draggable={false}
                            animate={{
                                scale: scale,
                                x: position.x,
                                y: position.y
                            }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200, mass: 0.5 }}
                            style={{
                                maxWidth: '90%',
                                maxHeight: '90%',
                                borderRadius: 10,
                                border: '1px solid #FDE8D8',
                                boxShadow: '0 4px 20px rgba(212,80,10,0.08)',
                                objectFit: 'contain',
                                userSelect: 'none',
                                pointerEvents: 'none', // Allow events to pass to container
                                cursor: scale === 1 ? 'zoom-in' : 'zoom-out',
                            }}
                        />

                        {/* Hover Zoom Hint */}
                        <AnimatePresence>
                            {isHovered && scale === 1 && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    style={{
                                        position: 'absolute',
                                        zIndex: 5,
                                        background: 'rgba(212,80,10,0.9)',
                                        color: '#FFF',
                                        padding: '8px 16px',
                                        borderRadius: 99,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        fontSize: 12,
                                        fontWeight: 800,
                                        fontFamily: 'Outfit',
                                        boxShadow: '0 4px 12px rgba(212,80,10,0.3)',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <FiSearch size={14} />
                                    Click to Zoom
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* zoom indicator overlay */}
                        {scale !== 1 && (
                            <div style={{
                                position: 'absolute', bottom: 12, right: 12,
                                background: 'rgba(255,255,255,0.9)',
                                padding: '4px 10px', borderRadius: 8,
                                border: '1px solid #FDE8D8',
                                fontSize: 11, fontWeight: 800, color: '#D4500A',
                                fontFamily: 'Outfit', pointerEvents: 'none',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                            }}>
                                {Math.round(scale * 100)}%
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Right: Editable table ── */}
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* table header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.8rem 1fr 5.5rem 2.8rem 3.2rem 4.5rem',
                    gap: '0 10px', padding: '12px 20px',
                    borderBottom: '1.5px solid #FDE8D8', background: '#FFF8F2',
                    alignItems: 'center',
                }}>
                    {['#', 'Subject Code', 'Grade', 'Cr', 'Pts', ''].map(h => (
                        <span key={h} style={{
                            fontSize: 9, fontWeight: 800, letterSpacing: '0.14em',
                            textTransform: 'uppercase', color: '#C8C4C0', fontFamily: 'Outfit',
                        }}>{h}</span>
                    ))}
                </div>

                {/* rows */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <AnimatePresence initial={false}>
                        {subjects.map((subj, idx) => {
                            const isEditing = !!editing[idx];
                            const pts = (GP[subj.grade] ?? 0) * (subj.credits ?? 0);
                            const confNum = typeof subj.confidence === 'number'
                                ? subj.confidence
                                : (subj.confidence === 'low' ? 0.6 : subj.confidence === 'medium' ? 0.8 : 0.95);
                            const isLow = confNum < 0.7;
                            const isMedium = confNum >= 0.7 && confNum < 0.9;
                            const needsReview = !!subj.review_required || isLow;

                            return (
                                <motion.div
                                    key={idx}
                                    layout
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.18 }}
                                    className="group"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1.8rem 1fr 5.5rem 2.8rem 3.2rem 4.5rem',
                                        gap: '0 10px', padding: '10px 20px',
                                        borderBottom: '1px solid rgba(253,232,216,0.55)',
                                        borderLeft: needsReview ? '3px solid #EF4444' : (isMedium ? '3px solid #F59E0B' : '3px solid transparent'),
                                        alignItems: 'center',
                                        background: isEditing ? 'rgba(212,80,10,0.03)' : (needsReview ? 'rgba(239,68,68,0.04)' : 'transparent'),
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#C0BAB4', fontFamily: 'Outfit' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{
                                                width: 8,
                                                height: 8,
                                                borderRadius: 999,
                                                display: 'inline-block',
                                                background: isLow ? '#EF4444' : (isMedium ? '#F59E0B' : '#10B981')
                                            }} />
                                            {String(idx + 1).padStart(2, '0')}
                                        </span>
                                    </span>

                                    {/* code */}
                                    {isEditing ? (
                                        <input
                                            autoFocus
                                            value={editing[idx].subject_code}
                                            onChange={e => setEditing(p => ({ ...p, [idx]: { ...p[idx], subject_code: e.target.value.toUpperCase() } }))}
                                            style={{
                                                border: '1.5px solid #FDE8D8', borderRadius: 6,
                                                padding: '3px 8px', fontSize: 13, fontWeight: 800,
                                                fontFamily: 'Outfit', color: '#D4500A', outline: 'none',
                                                width: '100%', background: '#FFF',
                                            }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1A2E', fontFamily: 'Outfit', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 5 }}>
                                            {subj.subject_code}
                                            {subj.original_semester ? (
                                                <span style={{
                                                    fontSize: 9,
                                                    fontWeight: 800,
                                                    padding: '1px 6px',
                                                    borderRadius: 999,
                                                    color: '#1E293B',
                                                    background: 'rgba(30,41,59,0.08)',
                                                    border: '1px solid rgba(30,41,59,0.15)'
                                                }}>
                                                    S{subj.original_semester}
                                                </span>
                                            ) : null}
                                            {subj.overridden_by_revaluation ? (
                                                <span style={{
                                                    fontSize: 9,
                                                    fontWeight: 900,
                                                    padding: '1px 6px',
                                                    borderRadius: 999,
                                                    color: '#7C3AED',
                                                    background: 'rgba(124,58,237,0.12)',
                                                    border: '1px solid rgba(124,58,237,0.25)'
                                                }}>
                                                    REV
                                                </span>
                                            ) : null}
                                            {subj.cleared_in_semester ? (
                                                <span style={{
                                                    fontSize: 9,
                                                    fontWeight: 900,
                                                    padding: '1px 6px',
                                                    borderRadius: 999,
                                                    color: '#065F46',
                                                    background: 'rgba(16,185,129,0.14)',
                                                    border: '1px solid rgba(16,185,129,0.3)'
                                                }}>
                                                    ✓ cleared Sem {subj.cleared_in_semester}
                                                </span>
                                            ) : null}
                                            {needsReview && <FiAlertTriangle size={11} color="#EF4444" />}
                                        </span>
                                    )}

                                    {/* grade */}
                                    {isEditing ? (
                                        <select
                                            value={editing[idx].grade}
                                            onChange={e => setEditing(p => ({ ...p, [idx]: { ...p[idx], grade: e.target.value } }))}
                                            style={{
                                                border: '1.5px solid #FDE8D8', borderRadius: 6,
                                                padding: '3px 6px', fontSize: 12, fontWeight: 800,
                                                fontFamily: 'Outfit', color: '#D4500A', outline: 'none',
                                                background: '#FFF',
                                            }}
                                        >
                                            {VALID_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    ) : (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            <GradePill grade={subj.grade} />
                                            {subj.overridden_by_revaluation && subj.main_grade && subj.main_grade !== subj.grade ? (
                                                <span style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', fontFamily: 'Outfit' }}>
                                                    {subj.main_grade} → {subj.grade}
                                                </span>
                                            ) : null}
                                        </div>
                                    )}

                                    {isEditing ? (
                                        <input
                                            value={editing[idx].credits}
                                            onChange={e => setEditing(p => ({ ...p, [idx]: { ...p[idx], credits: e.target.value } }))}
                                            inputMode="decimal"
                                            style={{
                                                border: '1.5px solid #FDE8D8', borderRadius: 6,
                                                padding: '3px 6px', fontSize: 12, fontWeight: 800,
                                                fontFamily: 'Outfit', color: '#D4500A', outline: 'none',
                                                background: '#FFF', textAlign: 'right', width: '100%'
                                            }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: 12, fontWeight: 700, color: '#78716C', fontFamily: 'Outfit', textAlign: 'right' }}>
                                            {subj.credits ?? '—'}
                                        </span>
                                    )}

                                    {isEditing ? (
                                        <input
                                            value={editing[idx].points}
                                            onChange={e => setEditing(p => ({ ...p, [idx]: { ...p[idx], points: e.target.value } }))}
                                            inputMode="decimal"
                                            style={{
                                                border: '1.5px solid #FDE8D8', borderRadius: 6,
                                                padding: '3px 6px', fontSize: 12, fontWeight: 800,
                                                fontFamily: 'Outfit', color: '#D4500A', outline: 'none',
                                                background: '#FFF', textAlign: 'right', width: '100%'
                                            }}
                                        />
                                    ) : (
                                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Outfit', textAlign: 'right', color: pts ? '#D4500A' : '#D1D5DB' }}>
                                            {pts || '—'}
                                        </span>
                                    )}

                                    {/* action buttons */}
                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                        {isEditing ? (
                                            <>
                                                <button onClick={() => saveEdit(idx)} style={iconBtn('#059669')}><FiCheck size={13} /></button>
                                                <button onClick={() => cancelEdit(idx)} style={iconBtn('#9CA3AF')}><FiX size={13} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => startEdit(idx, subj)} style={{ ...iconBtn('#D4500A'), opacity: 0 }} className="group-hover:opacity-100" title="Edit"><FiEdit2 size={13} /></button>
                                                <button onClick={() => removeRow(idx)} style={{ ...iconBtn('#EF4444'), opacity: 0 }} className="group-hover:opacity-100" title="Remove"><FiTrash2 size={13} /></button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {subjects.some(s => s.review_required) && (
                    <div style={{
                        padding: '8px 20px',
                        borderTop: '1px solid #FDE8D8',
                        background: 'rgba(239,68,68,0.06)',
                        color: '#991B1B',
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: 'Outfit'
                    }}>
                        Review required: one or more rows were auto-overridden using revaluation results. Please verify highlighted rows.
                    </div>
                )}

                {/* add subject footer */}
                <div style={{
                    padding: '8px 20px', borderTop: '1px solid #FDE8D8',
                    background: '#FAFAFA', display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <button
                        onClick={addRow}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 12px', borderRadius: 8,
                            border: '1.5px dashed rgba(212,80,10,0.3)',
                            background: 'transparent', cursor: 'pointer',
                            fontSize: 11, fontWeight: 700, color: '#D4500A',
                            fontFamily: 'Outfit',
                        }}
                    >
                        <FiPlus size={13} /> Add subject
                    </button>
                    <span style={{ fontSize: 10, color: '#C8C4C0', fontFamily: 'Outfit' }}>
                        {subjects.length} subjects detected
                    </span>
                </div>
            </div>
        </motion.div>
    );
}

/* tiny icon button style */
function iconBtn(color: string) {
    return {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: 6,
        border: `1px solid ${color}30`, background: `${color}10`,
        color, cursor: 'pointer', transition: 'all 0.15s',
    } as React.CSSProperties;
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function PreviewSection({ imageUrls, ocrData, onConfirm, onBack }: PreviewSectionProps) {
    /*
      A single ocrData object covers all subjects for potentially multiple sems.
      We treat each marksheet image as one "slide" — if only one image, one slide.
      The subjects are all combined; per-slide GPA is computed from the full set
      (since we don't have per-image subject splits from the back end today).
      The user confirms the whole set on the final slide.
    */
    const totalSlides = Math.max(imageUrls.length, 1);

    // Per-slide subject arrays — prioritising exact mapping from OCR
    const [slideSubjects, setSlideSubjects] = useState<PreviewSubject[][]>(() => {
        // Use exact per-file results if available (strongest source)
        if (ocrData.subjects_per_file && Array.isArray(ocrData.subjects_per_file)) {
            return ocrData.subjects_per_file;
        }

        const all = ocrData.subjects || [];
        if (imageUrls.length <= 1) return [all];
        // Fallback: Distribute subjects roughly evenly across slides
        const perSlide = Math.ceil(all.length / imageUrls.length);
        return imageUrls.map((_, i) => all.slice(i * perSlide, (i + 1) * perSlide));
    });

    const [currentIdx, setCurrentIdx] = useState(0);
    const [direction, setDirection]   = useState(1);
    const [skipped, setSkipped]       = useState<Set<number>>(new Set());

    const semLabel = `Sem ${currentIdx + 1} of ${totalSlides}`;
    const curSubjects = slideSubjects[currentIdx] || [];
    const gpa = calcGPA(curSubjects);
    const issues = hasIssues(curSubjects);

    const go = (delta: number) => {
        const next = currentIdx + delta;
        if (next < 0 || next >= totalSlides) return;
        setDirection(delta);
        setCurrentIdx(next);
    };

    const handleSkip = () => {
        setSkipped(p => new Set([...p, currentIdx]));
        if (currentIdx < totalSlides - 1) go(1);
        else confirmAll();
    };

    const handleNext = () => {
        if (currentIdx < totalSlides - 1) go(1);
        else confirmAll();
    };

    const confirmAll = () => {
        const all = slideSubjects.flat();
        onConfirm(all);
    };

    const isLast = currentIdx === totalSlides - 1;

    /* swipe gesture */
    const dragStart = useRef(0);
    const onDragStart = (e: React.TouchEvent) => { dragStart.current = e.touches[0].clientX; };
    const onDragEnd = (e: React.TouchEvent) => {
        const delta = dragStart.current - e.changedTouches[0].clientX;
        if (Math.abs(delta) > 50) go(delta > 0 ? 1 : -1);
    };

    /* ─── render ─────────────────────────────────────────────────────────── */
    return (
        <div
            onTouchStart={onDragStart}
            onTouchEnd={onDragEnd}
            style={{
                display: 'flex', flexDirection: 'column',
                minHeight: '85vh', maxWidth: 1100, margin: '0 auto',
                background: '#FFFDF9', borderRadius: 28, overflow: 'hidden',
                border: '1.5px solid #FDE8D8',
                boxShadow: '0 8px 48px rgba(212,80,10,0.08)',
            }}
        >
            {/* ══ TOP BAR ══ */}
            <div style={{
                padding: '16px 28px',
                borderBottom: '1.5px solid #FDE8D8',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFAF6', flexShrink: 0,
            }}>
                {/* back */}
                <button
                    onClick={onBack}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, color: '#B2A49A',
                        fontFamily: 'Outfit', padding: 0,
                    }}
                >
                    <FiChevronLeft size={16} /> Back
                </button>

                {/* progress dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {Array.from({ length: totalSlides }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => { setDirection(i > currentIdx ? 1 : -1); setCurrentIdx(i); }}
                            style={{
                                width: i === currentIdx ? 28 : 8,
                                height: 8, borderRadius: 99,
                                background: i === currentIdx
                                    ? '#D4500A'
                                    : skipped.has(i)
                                        ? '#D1D5DB'
                                        : i < currentIdx
                                            ? '#059669'
                                            : 'rgba(212,80,10,0.2)',
                                border: 'none', cursor: 'pointer', padding: 0,
                                transition: 'all 0.25s ease',
                                boxShadow: i === currentIdx ? '0 0 8px rgba(212,80,10,0.45)' : 'none',
                            }}
                        />
                    ))}
                </div>

                {/* sem label + warning */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {issues && (
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: 11, fontWeight: 700, fontFamily: 'Outfit',
                            color: '#F59E0B', padding: '3px 10px',
                            background: '#FEF3C7', borderRadius: 999,
                            border: '1px solid #FDE68A',
                        }}>
                            <FiAlertTriangle size={11} /> Needs review
                        </span>
                    )}
                    <span style={{
                        fontSize: 12, fontWeight: 800, fontFamily: 'Outfit', color: '#D4500A',
                        background: 'rgba(212,80,10,0.08)', borderRadius: 999, padding: '4px 14px',
                        border: '1px solid rgba(212,80,10,0.15)',
                    }}>
                        {semLabel}
                    </span>
                </div>
            </div>

            {/* ══ SLIDE CONTENT ══ */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <AnimatePresence custom={direction} mode="wait">
                    <SemSlide
                        key={currentIdx}
                        imageUrl={imageUrls[currentIdx] ?? null}
                        subjects={curSubjects}
                        semLabel={semLabel}
                        direction={direction}
                        onChange={updated => setSlideSubjects(prev => prev.map((s, i) => i === currentIdx ? updated : s))}
                    />
                </AnimatePresence>
            </div>

            {/* ══ BOTTOM BAR ══ */}
            <div style={{
                padding: '16px 28px', borderTop: '1.5px solid #FDE8D8',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFAF6', flexShrink: 0,
            }}>
                {/* GPA this sem */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B2A49A', fontFamily: 'Outfit' }}>
                        GPA this sem
                    </span>
                    <span style={{ fontSize: 26, fontWeight: 900, fontFamily: 'Outfit', color: '#D4500A', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {gpa ?? '—'}
                    </span>
                    <span style={{ fontSize: 11, color: '#B2A49A', fontFamily: 'Outfit' }}>/ 10</span>
                </div>

                {/* actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* prev */}
                    {currentIdx > 0 && (
                        <button
                            onClick={() => go(-1)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                                border: '1.5px solid #FDE8D8', borderRadius: 12, background: '#FFF',
                                cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#78716C', fontFamily: 'Outfit',
                            }}
                        >
                            <FiChevronLeft size={16} /> Prev
                        </button>
                    )}

                    {/* skip */}
                    <button
                        onClick={handleSkip}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                            border: '1.5px solid #E7E5E4', borderRadius: 12, background: '#FFF',
                            cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#9CA3AF', fontFamily: 'Outfit',
                        }}
                    >
                        <FiSkipForward size={14} /> {isLast ? 'Skip & Finish' : 'Skip'}
                    </button>

                    {/* next / confirm */}
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleNext}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px',
                            background: 'linear-gradient(135deg, #D4500A, #F28C1A)',
                            border: 'none', borderRadius: 12, cursor: 'pointer',
                            fontSize: 13, fontWeight: 800, color: '#FFF', fontFamily: 'Outfit',
                            boxShadow: '0 4px 16px rgba(212,80,10,0.25)',
                        }}
                    >
                        {isLast ? (
                            <><FiCheck size={15} /> Confirm & Calculate</>
                        ) : (
                            <>Next <FiChevronRight size={15} /></>
                        )}
                    </motion.button>
                </div>
            </div>

            {/* CSS for group-hover reveal on edit/delete buttons */}
            <style>{`
                .group:hover button[title="Edit"],
                .group:hover button[title="Remove"] {
                    opacity: 1 !important;
                }
            `}</style>
        </div>
    );
}
