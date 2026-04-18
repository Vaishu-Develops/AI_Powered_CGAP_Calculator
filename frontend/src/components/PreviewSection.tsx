'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiChevronLeft, FiChevronRight,
    FiEdit2, FiCheck, FiX,
    FiPlus, FiTrash2, FiAlertTriangle, FiSkipForward,
    FiSearch, FiFileText,
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
    fileSemesters?: number[]; // Added to map slides to semesters
    onConfirm: (editedSubjects: PreviewSubject[], selectedSemester?: number) => void;
    onBack: () => void;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const VALID_GRADES = ['S', 'O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'RA', 'SA', 'W', '-'];

const GP: Record<string, number> = {
    'S': 10, 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'U': 0, 'RA': 0, 'SA': 0, 'W': 0,
};

const GRADE_COLOR: Record<string, string> = {
    'S': '#059669',
    'O': '#059669', 'A+': '#7C3AED', 'A': '#D97706',
    'B+': '#0EA5E9', 'B': '#14B8A6', 'C': '#6B7280',
    'U': '#EF4444', 'RA': '#EF4444', 'SA': '#F59E0B', 'W': '#9CA3AF',
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function calcGPA(subjects: PreviewSubject[], currentSemester?: number) {
    const currentSemSubjects = typeof currentSemester === 'number'
        ? subjects.filter(s => Number((s as any).original_semester || (s as any).semester || currentSemester) === currentSemester)
        : subjects;

    const passing = currentSemSubjects.filter(s => !['U', 'RA', 'SA', 'W', '-'].includes(s.grade));
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

const GradePill = ({ grade }: { grade: string }) => {
    const isPassing = !['U', 'RA', 'SA', 'W', '-'].includes(grade);
    const color = GRADE_COLOR[grade] || '#6B7280';
    return (
        <span style={{
            padding: '1px 8px', borderRadius: 999,
            fontSize: 11, fontWeight: 800, fontFamily: 'Outfit',
            color: isPassing ? color : '#EF4444',
            background: isPassing ? `${color}15` : '#EF444415',
            border: `1px solid ${isPassing ? `${color}40` : '#EF444440'}`,
            minWidth: 24, textAlign: 'center', display: 'inline-block'
        }}>
            {grade}
        </span>
    );
};

/* ─── Single Sem Slide ───────────────────────────────────────────────────── */
function SemSlide({
    imageUrl, subjects, semLabel, direction, semNum, onChange,
}: {
    imageUrl: string | null;
    subjects: PreviewSubject[];
    semLabel: string;
    direction: number;
    semNum?: number;
    onChange: (updated: PreviewSubject[]) => void;
}) {
    // Mobile detection
    const [isMobile, setIsMobile] = useState(false);
    const [docExpanded, setDocExpanded] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // State: Image Viewer
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasDraggedRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const scaleRef = useRef(1);
    useEffect(() => { scaleRef.current = scale; }, [scale]);

    // State: Row Editing
    const [editing, setEditing] = useState<Record<number, PreviewSubject>>({});

    // Handlers: Image Zoom
    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const toggleZoom = () => {
        if (scale > 1) resetZoom();
        else setScale(2);
    };

    // Wheel interaction with passive:false listener for UX-friendly zoom/pan
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const onWheel = (e: WheelEvent) => {
            // Always keep wheel interaction inside the preview area
            e.preventDefault();

            // Shift + wheel can pan when zoomed in
            if (e.shiftKey && scaleRef.current > 1) {
                setPosition(prev => ({
                    x: prev.x - e.deltaY,
                    y: prev.y,
                }));
                return;
            }

            // Natural wheel zoom without requiring Ctrl key
            const delta = -e.deltaY * 0.0035;
            setScale(prev => Math.min(Math.max(1, prev + delta), 4));
        };

        el.addEventListener('wheel', onWheel, { passive: false });
        return () => el.removeEventListener('wheel', onWheel);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            hasDraggedRef.current = false;
            dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
            e.stopPropagation();
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            hasDraggedRef.current = true;
            setPosition({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        // Keep click suppressed right after a drag, then allow future click-to-zoom.
        setTimeout(() => {
            hasDraggedRef.current = false;
        }, 0);
    };

    // Handlers: Row Editing
    const startEdit = (idx: number, subject: PreviewSubject) => {
        setEditing(prev => ({ ...prev, [idx]: { ...subject } }));
    };

    const cancelEdit = (idx: number) => {
        setEditing(prev => {
            const next = { ...prev };
            delete next[idx];
            return next;
        });
    };

    const saveEdit = (idx: number) => {
        const edited = editing[idx];
        if (!edited) return;

        const newSubjects = [...subjects];
        // Ensure numeric fields are normalized before saving edits.
        if (typeof edited.credits === 'string') {
            edited.credits = Number(edited.credits) || 0;
        }
        const parsedSem = Number((edited as any).original_semester);
        (edited as any).original_semester = parsedSem > 0 ? Math.floor(parsedSem) : undefined;

        newSubjects[idx] = edited;
        onChange(newSubjects);

        cancelEdit(idx);
    };

    const addRow = () => {
        const newS: PreviewSubject = {
            subject_code: 'NEW101',
            grade: 'O',
            credits: 3,
            original_semester: semNum || undefined
        };
        const updated = [...subjects, newS];
        onChange(updated);
        setTimeout(() => startEdit(updated.length - 1, newS), 50);
    };

    const removeRow = (idx: number) => {
        onChange(subjects.filter((_, i) => i !== idx));
        cancelEdit(idx);
    };

    const iconBtn = (color: string) => ({
        padding: '4px',
        borderRadius: 4,
        border: 'none',
        background: 'transparent',
        color,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.2s',
    });

    const slideVariants = {
        enter: (d: number) => ({ x: d > 0 ? '60%' : '-60%', opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (d: number) => ({ x: d > 0 ? '-60%' : '60%', opacity: 0 }),
    };

    if (isMobile) {
        return (
            <motion.div
                key={semLabel}
                custom={direction}
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ type: 'spring', stiffness: 280, damping: 30 }}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, background: '#FFFDF9', overflow: 'hidden' }}
            >
                {/* ── Mobile: Collapsible Document Strip ── */}
                {imageUrl && (
                    <div style={{ margin: '8px 12px', borderRadius: 12, border: '1px solid #F7C59F', background: '#FFF8F0', overflow: 'hidden' }}>
                        <button
                            onClick={() => setDocExpanded(!docExpanded)}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer',
                                fontFamily: 'Outfit', fontSize: 13, fontWeight: 700, color: '#1A1A2E',
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FiFileText size={15} style={{ color: '#D4500A' }} /> {semLabel}
                            </span>
                            <span style={{ fontSize: 16, color: '#B2A49A', transition: 'transform 0.2s', transform: docExpanded ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
                        </button>
                        <AnimatePresence>
                            {docExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    style={{ overflow: 'hidden', padding: '0 12px 12px' }}
                                >
                                    <img
                                        src={imageUrl} alt={semLabel} draggable={false}
                                        style={{ width: '100%', maxHeight: 240, objectFit: 'contain', borderRadius: 8, border: '1px solid #FDE8D8' }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── Mobile: Subject Count ── */}
                <div style={{ padding: '8px 16px 4px', fontSize: 12, fontWeight: 700, color: '#B2A49A', fontFamily: 'Outfit' }}>
                    {subjects.length} subjects detected
                </div>

                {/* ── Mobile: Full-Width Subject Rows ── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
                    <AnimatePresence initial={false}>
                        {subjects.map((subj, idx) => {
                            const isEditingRow = !!editing[idx];
                            const confNum = typeof subj.confidence === 'number' ? subj.confidence : (subj.confidence === 'low' ? 0.6 : 0.95);
                            const isLow = confNum < 0.7;
                            const needsReview = !!subj.review_required || isLow;

                            return (
                                <motion.div
                                    key={idx} layout
                                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.18 }}
                                    style={{
                                        padding: '14px 16px', minHeight: 56,
                                        borderBottom: '1px solid #F5EFE8',
                                        borderLeft: needsReview ? '3px solid #EF4444' : '3px solid transparent',
                                        background: isEditingRow ? 'rgba(212,80,10,0.03)' : 'transparent',
                                    }}
                                >
                                    {isEditingRow ? (
                                        /* ── Mobile Edit Mode ── */
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <input autoFocus value={editing[idx].subject_code}
                                                onChange={e => setEditing(p => ({ ...p, [idx]: { ...p[idx], subject_code: e.target.value.toUpperCase() } }))}
                                                style={{ width: '100%', border: '1.5px solid #FDE8D8', borderRadius: 8, padding: '8px 12px', fontSize: 14, fontWeight: 800, fontFamily: 'Outfit', color: '#D4500A', outline: 'none', background: '#FFF' }}
                                            />
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <select value={editing[idx].grade}
                                                    onChange={e => setEditing(p => ({ ...p, [idx]: { ...p[idx], grade: e.target.value } }))}
                                                    style={{ flex: 1, minWidth: 0, border: '1.5px solid #FDE8D8', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 800, fontFamily: 'Outfit', color: '#D4500A', outline: 'none', background: '#FFF' }}
                                                >
                                                    {VALID_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                                <input
                                                    value={editing[idx].original_semester ?? ''}
                                                    inputMode="numeric"
                                                    min={1}
                                                    max={8}
                                                    onChange={e => setEditing(p => ({ ...p, [idx]: { ...p[idx], original_semester: e.target.value } as any }))}
                                                    title="Semester"
                                                    style={{ width: 58, border: '1.5px solid #FDE8D8', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 800, fontFamily: 'Outfit', color: '#D4500A', outline: 'none', background: '#FFF', textAlign: 'center' }}
                                                />
                                                <input value={editing[idx].credits} inputMode="decimal"
                                                    onChange={e => setEditing(p => ({ ...p, [idx]: { ...p[idx], credits: e.target.value } }))}
                                                    style={{ width: 58, border: '1.5px solid #FDE8D8', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 800, fontFamily: 'Outfit', color: '#D4500A', outline: 'none', background: '#FFF', textAlign: 'center' }}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                                <button onClick={() => saveEdit(idx)} style={{ ...iconBtn('#059669'), padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}><FiCheck size={14} /> Save</button>
                                                <button onClick={() => cancelEdit(idx)} style={{ ...iconBtn('#9CA3AF'), padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}><FiX size={14} /></button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ── Mobile Display Mode ── */
                                        <div onClick={() => startEdit(idx, subj)} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#A8A29E', fontFamily: 'Outfit', width: 24 }}>
                                                        {String(idx + 1).padStart(2, '0')}
                                                    </span>
                                                    <span style={{ fontSize: 16, fontWeight: 600, color: '#0F0A00', fontFamily: 'Outfit', letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {subj.subject_code}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <GradePill grade={subj.grade} />
                                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#78716C', fontFamily: 'Outfit', marginLeft: 4 }}>
                                                        {subj.credits ?? '—'}
                                                    </span>
                                                    <button onClick={(e) => { e.stopPropagation(); removeRow(idx); }}
                                                        style={{ background: 'none', border: 'none', color: '#D1D5DB', padding: 4, cursor: 'pointer', display: 'flex' }}>
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Inline cleared badge */}
                                            {(subj.cleared_in_semester || subj.overridden_by_revaluation) && (
                                                <div style={{ marginTop: 2, marginLeft: 34, fontSize: 12, color: '#059669', fontWeight: 600, fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    {subj.cleared_in_semester && <span>✓ arrear · cleared Sem {subj.cleared_in_semester}</span>}
                                                    {subj.overridden_by_revaluation && <span style={{ color: '#7C3AED' }}>REV {subj.main_grade} → {subj.grade}</span>}
                                                </div>
                                            )}
                                            {needsReview && (
                                                <div style={{ marginTop: 2, marginLeft: 34, fontSize: 11, color: '#EF4444', fontWeight: 700, fontFamily: 'Outfit', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <FiAlertTriangle size={11} /> Needs review
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* ── Mobile: Add Subject ── */}
                <div style={{ padding: '8px 16px', borderTop: '1px solid #F5EFE8' }}>
                    <button onClick={addRow} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12,
                        border: '1.5px dashed rgba(212,80,10,0.3)', background: 'transparent', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, color: '#D4500A', fontFamily: 'Outfit', width: '100%', justifyContent: 'center',
                    }}>
                        <FiPlus size={15} /> Add subject
                    </button>
                </div>
            </motion.div>
        );
    }

    /* ── Desktop Layout (unchanged) ── */
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
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
                                            <input
                                                value={editing[idx].original_semester ?? ''}
                                                inputMode="numeric"
                                                min={1}
                                                max={8}
                                                title="Semester"
                                                onChange={e => setEditing(p => ({ ...p, [idx]: { ...p[idx], original_semester: e.target.value } as any }))}
                                                style={{
                                                    width: 42,
                                                    border: '1.5px solid #FDE8D8', borderRadius: 6,
                                                    padding: '3px 6px', fontSize: 12, fontWeight: 800,
                                                    fontFamily: 'Outfit', color: '#D4500A', outline: 'none',
                                                    background: '#FFF', textAlign: 'center',
                                                }}
                                            />
                                        </div>
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
export default function PreviewSection({ imageUrls, ocrData, fileSemesters, onConfirm, onBack }: PreviewSectionProps) {
    /*
      A single ocrData object covers all subjects for potentially multiple sems.
      We treat each marksheet image as one "slide" — if only one image, one slide.
      The subjects are all combined; per-slide GPA is computed from the full set
      (since we don't have per-image subject splits from the back end today).
      The user confirms the whole set on the final slide.
    */
    const totalSlides = Math.max(imageUrls.length, 1);

    // Mobile detection
    const [isMobileMain, setIsMobileMain] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 768px)');
        setIsMobileMain(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobileMain(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

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
    const [direction, setDirection] = useState(1);
    const [skipped, setSkipped] = useState<Set<number>>(new Set());
    const [editingSemester, setEditingSemester] = useState(false);
    const [tempSem, setTempSem] = useState<string>('');
    const [showSemTooltip, setShowSemTooltip] = useState(false);

    const curSubjects = slideSubjects[currentIdx] || [];
    
    // Derive current semester from subjects on the slide (most common, or max if varied)
    const semestersInSlide = curSubjects
        .map(subj => Number(subj.original_semester || subj.semester || currentIdx + 1))
        .filter(s => s > 0);
    const currentSemNum = semestersInSlide.length > 0
        ? Math.max(...semestersInSlide)  // Use max to handle mixed semesters
        : fileSemesters?.[currentIdx] || (currentIdx + 1);
    
    const semLabel = `Semester ${currentSemNum}`;

    const handleSemesterSave = () => {
        const newSem = Number(tempSem);
        if (newSem > 0 && newSem <= 8) {
            // Update all subjects on current slide to have new semester
            setSlideSubjects(prev => prev.map((subjList, idx) => {
                if (idx === currentIdx) {
                    return subjList.map(subj => ({
                        ...subj,
                        original_semester: newSem,
                        semester: newSem,
                        home_semester: newSem,
                    }));
                }
                return subjList;
            }));
        }
        setEditingSemester(false);
        setShowSemTooltip(false);
        setTempSem('');
    };

    const handleSemesterClick = () => {
        setTempSem(String(currentSemNum || 1));
        setEditingSemester(true);
    };
    const gpa = calcGPA(curSubjects, currentSemNum);
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
        onConfirm(all, currentSemNum);
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
                minHeight: isMobileMain ? '100vh' : '85vh',
                maxWidth: isMobileMain ? '100%' : 1100,
                margin: '0 auto',
                background: '#FFFDF9',
                borderRadius: isMobileMain ? 0 : 28,
                overflow: 'hidden',
                border: isMobileMain ? 'none' : '1.5px solid #FDE8D8',
                boxShadow: isMobileMain ? 'none' : '0 8px 48px rgba(212,80,10,0.08)',
            }}
        >
            {/* ══ TOP BAR ══ */}
            <div style={{
                padding: isMobileMain ? '12px 16px' : '16px 28px',
                borderBottom: '1.5px solid #FDE8D8',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFAF6', flexShrink: 0,
                ...(isMobileMain ? { flexWrap: 'wrap' as const, rowGap: 8 } : {}),
            }}>
                {/* back */}
                <button
                    onClick={onBack}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 13, fontWeight: 700, color: '#B2A49A',
                        fontFamily: 'Outfit', padding: 0,
                        ...(isMobileMain ? { order: 1 as const } : {}),
                    }}
                >
                    <FiChevronLeft size={16} /> Back
                </button>

                {/* progress dots */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...(isMobileMain ? { order: 3 as const, width: '100%', justifyContent: 'center' } : {}) }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...(isMobileMain ? { order: 2 as const, marginLeft: 'auto' } : {}) }}>
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
                    {editingSemester ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                                autoFocus
                                type="number"
                                min={1}
                                max={8}
                                value={tempSem}
                                onChange={e => setTempSem(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSemesterSave();
                                    if (e.key === 'Escape') { setEditingSemester(false); setTempSem(''); }
                                }}
                                style={{
                                    width: 50,
                                    border: '1.5px solid #D4500A',
                                    borderRadius: 6,
                                    padding: '4px 8px',
                                    fontSize: 12,
                                    fontWeight: 800,
                                    fontFamily: 'Outfit',
                                    color: '#D4500A',
                                    outline: 'none',
                                    background: '#FFF',
                                    textAlign: 'center',
                                }}
                            />
                            <button
                                onClick={handleSemesterSave}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #059669',
                                    background: '#059669',
                                    color: 'white',
                                    fontFamily: 'Outfit',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <FiCheck size={13} />
                            </button>
                            <button
                                onClick={() => { setEditingSemester(false); setTempSem(''); }}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #EF4444',
                                    background: '#EF4444',
                                    color: 'white',
                                    fontFamily: 'Outfit',
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <FiX size={13} />
                            </button>
                        </div>
                    ) : (
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={handleSemesterClick}
                                aria-label="Click to edit semester"
                                style={{
                                    fontSize: 12, fontWeight: 800, fontFamily: 'Outfit', color: '#D4500A',
                                    background: 'rgba(212,80,10,0.08)', borderRadius: 999, padding: '4px 14px',
                                    border: '1px solid rgba(212,80,10,0.15)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => {
                                    setShowSemTooltip(true);
                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(212,80,10,0.14)';
                                }}
                                onMouseLeave={e => {
                                    setShowSemTooltip(false);
                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(212,80,10,0.08)';
                                }}
                                onFocus={() => setShowSemTooltip(true)}
                                onBlur={() => setShowSemTooltip(false)}
                            >
                                {semLabel}
                            </button>
                            {showSemTooltip && !isMobileMain && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: 'calc(100% + 6px)',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        background: '#1F2937',
                                        color: '#fff',
                                        fontSize: 10,
                                        fontWeight: 700,
                                        fontFamily: 'Outfit',
                                        padding: '4px 8px',
                                        borderRadius: 6,
                                        whiteSpace: 'nowrap',
                                        pointerEvents: 'none',
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                                        zIndex: 20,
                                    }}
                                >
                                    Click to edit semester
                                </span>
                            )}
                        </div>
                    )}
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
                        semNum={currentSemNum}
                        onChange={updated => setSlideSubjects(prev => prev.map((s, i) => i === currentIdx ? updated : s))}
                    />
                </AnimatePresence>
            </div>

            {/* ══ BOTTOM BAR ══ */}
            <div style={{
                padding: isMobileMain ? '12px 16px' : '16px 28px',
                borderTop: '1.5px solid #FDE8D8',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#FFFAF6', flexShrink: 0,
                ...(isMobileMain ? { position: 'sticky' as const, bottom: 0, zIndex: 20, boxShadow: '0 -4px 16px rgba(0,0,0,0.06)' } : {}),
                flexWrap: isMobileMain ? 'wrap' as const : 'nowrap' as const,
                gap: isMobileMain ? 8 : 0,
            }}>
                {/* GPA this sem */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, ...(isMobileMain ? { width: '100%', borderBottom: '1px solid #F5EFE8', paddingBottom: 8 } : {}) }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B2A49A', fontFamily: 'Outfit' }}>
                        GPA:
                    </span>
                    <span style={{ fontSize: isMobileMain ? 22 : 26, fontWeight: 900, fontFamily: 'Outfit', color: '#D4500A', letterSpacing: '-0.02em', lineHeight: 1 }}>
                        {gpa ?? '—'}
                    </span>
                    <span style={{ fontSize: 11, color: '#B2A49A', fontFamily: 'Outfit' }}>/ 10</span>
                </div>

                {/* actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: isMobileMain ? 8 : 10, ...(isMobileMain ? { width: '100%', justifyContent: 'space-between' } : {}) }}>
                    {/* prev */}
                    {currentIdx > 0 && (
                        <button
                            onClick={() => go(-1)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px',
                                border: '1.5px solid #FDE8D8', borderRadius: 12, background: '#FFF',
                                cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#78716C', fontFamily: 'Outfit',
                                ...(isMobileMain ? { flex: 1, justifyContent: 'center', minWidth: 0, padding: '10px 12px' } : {}),
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
                            ...(isMobileMain ? { flex: 1, justifyContent: 'center', minWidth: 0, padding: '10px 12px' } : {}),
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
                            ...(isMobileMain ? { flex: 2, justifyContent: 'center', minWidth: 0, padding: '10px 12px' } : {}),
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
