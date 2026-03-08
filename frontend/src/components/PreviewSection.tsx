'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiEye,
    FiCheckCircle,
    FiAlertTriangle,
    FiChevronLeft,
    FiChevronRight,
    FiEdit2,
    FiCheck,
    FiX,
    FiInfo,
    FiZap
} from 'react-icons/fi';

interface PreviewSubject {
    subject_code: string;
    grade: string;
    marks?: number;
    credits?: number;
    is_revaluation?: boolean;
}

interface PreviewSectionProps {
    imageUrls: string[];
    ocrData: {
        subjects: PreviewSubject[];
        semester_info?: { semester?: number; regulation?: string };
        confidence?: { overall?: number };
    };
    onConfirm: (editedSubjects: PreviewSubject[]) => void;
    onBack: () => void;
}

const VALID_GRADES = ['O', 'A+', 'A', 'B+', 'B', 'C', 'U', 'RA', 'SA', 'W', '-'];

function getGradeClass(grade: string) {
    if (grade === 'O') return 'bg-success/20 text-success border-success/30';
    if (grade === 'A+' || grade === 'A') return 'bg-primary/20 text-primary border-primary/30';
    if (grade === 'B+' || grade === 'B') return 'bg-accent-1/20 text-accent-1 border-accent-1/30';
    if (grade === 'C') return 'bg-neutral/20 text-text-muted border-neutral/30';
    if (grade === 'U' || grade === 'RA' || grade === 'SA') return 'bg-accent-2/20 text-accent-2 border-accent-2/30';
    return 'bg-neutral/10 text-text-muted border-border';
}

export default function PreviewSection({
    imageUrls,
    ocrData,
    onConfirm,
    onBack,
}: PreviewSectionProps) {
    const [subjects, setSubjects] = useState<PreviewSubject[]>([]);
    const [editing, setEditing] = useState<Record<number, { grade: string; marks: string; subject_code: string }>>({});
    const [activeImageIdx, setActiveImageIdx] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setSubjects(ocrData.subjects || []);
        setMounted(true);
    }, [ocrData]);

    const startEdit = (idx: number, subj: PreviewSubject) => {
        setEditing((prev) => ({
            ...prev,
            [idx]: { grade: subj.grade, marks: String(subj.marks ?? ''), subject_code: subj.subject_code },
        }));
    };

    const cancelEdit = (idx: number) => {
        setEditing((prev) => { const n = { ...prev }; delete n[idx]; return n; });
    };

    const saveEdit = (idx: number) => {
        const edits = editing[idx];
        if (!edits) return;
        const updated = [...subjects];
        updated[idx] = {
            ...updated[idx],
            grade: edits.grade.toUpperCase().trim(),
            marks: edits.marks ? Number(edits.marks) : undefined,
            subject_code: edits.subject_code.toUpperCase().trim() || updated[idx].subject_code,
        };
        setSubjects(updated);
        cancelEdit(idx);
    };

    const handleConfirm = () => {
        const finalSubjects = subjects.map((s, i) => {
            if (editing[i]) {
                const edits = editing[i];
                return {
                    ...s,
                    grade: edits.grade.toUpperCase().trim(),
                    marks: edits.marks ? Number(edits.marks) : s.marks,
                    subject_code: edits.subject_code.toUpperCase().trim() || s.subject_code,
                };
            }
            return s;
        });
        onConfirm(finalSubjects);
    };

    const confidence = ocrData.confidence?.overall;
    const semester = ocrData.semester_info?.semester;
    const regulation = ocrData.semester_info?.regulation;

    if (!mounted) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl mx-auto px-4 pb-20"
        >
            {/* Header Section */}
            <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-12">
                <div className="space-y-4">
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="flex items-center gap-3"
                    >
                        <div className="px-4 py-1.5 bg-accent-1/10 border border-accent-1/20 rounded-full flex items-center gap-2">
                            <FiEye className="text-accent-1" />
                            <span className="text-xs font-bold uppercase tracking-widest text-accent-1">OCR Analysis</span>
                        </div>
                        {confidence !== undefined && (
                            <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 ${confidence >= 0.8 ? 'bg-success/10 border-success/20 text-success' :
                                confidence >= 0.6 ? 'bg-accent-1/10 border-accent-1/20 text-accent-1' :
                                    'bg-accent-2/10 border-accent-2/20 text-accent-2'
                                }`}>
                                {confidence >= 0.8 ? <FiCheckCircle /> : <FiAlertTriangle />}
                                <span className="text-xs font-bold uppercase tracking-widest">
                                    {Math.round(confidence * 100)}% Confidence
                                </span>
                            </div>
                        )}
                    </motion.div>

                    <h2 className="text-4xl md:text-5xl font-black text-text-primary tracking-tighter">
                        Review <span className="text-primary">Extracted</span> Data
                    </h2>
                    <p className="text-text-muted max-w-xl text-lg leading-relaxed">
                        Verify the accuracy of your semester results. Ensure all subject codes and grades match your marksheets before we crunch the numbers.
                    </p>
                </div>

                <div className="flex gap-4">
                    {semester && (
                        <div className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20">
                            Semester {semester}
                        </div>
                    )}
                    {regulation && (
                        <div className="px-6 py-3 bg-bg-card-alt border border-border text-primary rounded-2xl font-bold">
                            R{regulation}
                        </div>
                    )}
                </div>
            </header>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                {/* ── Left Side: High-End Image Viewer (2/5 span) ── */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="relative group rounded-[32px] p-1 bg-gradient-to-br from-border to-border/30 overflow-hidden shadow-2xl shadow-primary/5">
                        <div className="relative bg-bg-card rounded-[31px] overflow-hidden flex flex-col h-[500px]">
                            {/* Viewer Toolbar */}
                            <div className="px-6 py-4 flex items-center justify-between bg-bg-card-alt/50 backdrop-blur-md border-b border-border z-10">
                                <span className="text-xs font-bold text-text-muted uppercase tracking-widest">
                                    Document {activeImageIdx + 1} / {imageUrls.length}
                                </span>

                                {imageUrls.length > 1 && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setActiveImageIdx(p => (p - 1 + imageUrls.length) % imageUrls.length)}
                                            className="p-2 bg-white border border-border rounded-xl text-text-primary hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                                        >
                                            <FiChevronLeft />
                                        </button>
                                        <button
                                            onClick={() => setActiveImageIdx(p => (p + 1) % imageUrls.length)}
                                            className="p-2 bg-white border border-border rounded-xl text-text-primary hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                                        >
                                            <FiChevronRight />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Image Container */}
                            <div className="flex-1 overflow-auto bg-neutral/5 p-8 flex items-center justify-center">
                                <AnimatePresence mode="wait">
                                    <motion.img
                                        key={activeImageIdx}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 1.05 }}
                                        src={imageUrls[activeImageIdx]}
                                        alt=""
                                        className="max-w-full max-h-full rounded-lg shadow-lg border border-border h-auto object-contain cursor-zoom-in"
                                    />
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Right Side: Dynamic Subject Management (3/5 span) ── */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="relative rounded-[32px] p-1 bg-gradient-to-br from-primary/10 to-accent-1/10">
                        <div className="bg-bg-card rounded-[31px] overflow-hidden border border-border shadow-xl">
                            {/* Table Header */}
                            <div className="px-8 py-6 border-b border-border bg-bg-card-alt/30 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <FiInfo />
                                    </div>
                                    <h3 className="font-bold text-lg text-text-primary">Extracted Results</h3>
                                </div>
                                <div className="text-xs text-text-muted font-bold tracking-widest uppercase">
                                    {subjects.length} Subjects Detected
                                </div>
                            </div>

                            {/* Subjects List */}
                            <div className="max-h-[500px] overflow-y-auto px-4 py-4 custom-scrollbar">
                                <div className="space-y-3">
                                    {subjects.map((subj, idx) => {
                                        const isEditing = editing[idx] !== undefined;
                                        return (
                                            <motion.div
                                                key={idx}
                                                layout
                                                initial={{ x: 20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className={`group relative p-4 rounded-2xl border transition-all duration-300 ${isEditing
                                                    ? 'bg-primary/5 border-primary/20 shadow-inner'
                                                    : 'bg-bg-card border-border hover:border-primary/30 hover:shadow-md'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 items-center gap-4">
                                                        <div className="flex items-center gap-4">
                                                            <span className="text-[10px] font-bold text-text-muted font-mono w-6">
                                                                {String(idx + 1).padStart(2, '0')}
                                                            </span>
                                                            {isEditing ? (
                                                                <input
                                                                    type="text"
                                                                    autoFocus
                                                                    className="bg-bg-card border border-border px-3 py-2 rounded-xl text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none w-full"
                                                                    value={editing[idx].subject_code}
                                                                    onChange={(e) => setEditing(prev => ({ ...prev, [idx]: { ...prev[idx], subject_code: e.target.value.toUpperCase() } }))}
                                                                />
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-black text-text-primary tracking-tight">{subj.subject_code}</span>
                                                                    {subj.is_revaluation && (
                                                                        <span className="px-2 py-0.5 bg-accent-1/10 text-accent-1 text-[8px] font-black uppercase rounded-sm border border-accent-1/20">REVAL</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex justify-center">
                                                            {isEditing ? (
                                                                <select
                                                                    className="bg-bg-card border border-border px-3 py-2 rounded-xl text-sm font-bold text-primary outline-none"
                                                                    value={editing[idx].grade}
                                                                    onChange={(e) => setEditing(prev => ({ ...prev, [idx]: { ...prev[idx], grade: e.target.value } }))}
                                                                >
                                                                    {VALID_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                                                </select>
                                                            ) : (
                                                                <div className={`px-4 py-1.5 rounded-xl border text-sm font-black transition-colors ${getGradeClass(subj.grade)}`}>
                                                                    {subj.grade || '—'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <button onClick={() => saveEdit(idx)} className="p-2 bg-success text-white rounded-xl shadow-lg shadow-success/20 hover:scale-110 active:scale-95 transition-transform"><FiCheck /></button>
                                                                <button onClick={() => cancelEdit(idx)} className="p-2 bg-bg-card-alt text-text-muted rounded-xl hover:text-accent-2 transition-colors"><FiX /></button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => startEdit(idx, subj)} className="p-2 opacity-0 group-hover:opacity-100 bg-bg-card-alt text-text-muted rounded-xl hover:text-primary hover:bg-primary/5 transition-all"><FiEdit2 /></button>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Subjects Footer/Notice */}
                            <div className="px-8 py-4 bg-bg-card-alt/50 border-t border-border flex items-center gap-3">
                                <FiAlertTriangle className="text-accent-1 w-4 h-4 flex-shrink-0" />
                                <span className="text-[10px] text-text-muted font-medium">Verify all codes and grades manually. Accuracy depends on document clarity.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Controls */}
            <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mt-12 flex flex-col md:flex-row items-center justify-between p-8 rounded-[32px] bg-bg-card-alt/50 border border-border backdrop-blur-xl gap-6"
            >
                <button onClick={onBack} className="flex items-center gap-3 font-bold text-text-muted hover:text-primary transition-colors group">
                    <FiChevronLeft className="group-hover:-x-1 transition-transform" />
                    Upload Different Image
                </button>

                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="text-center md:text-right">
                        <div className="text-2xl font-black text-text-primary tracking-tight">
                            {subjects.length} <span className="text-text-muted text-sm font-bold uppercase tracking-widest pl-1">Subjects</span>
                        </div>
                        <div className="text-xs text-text-muted font-medium">
                            {subjects.filter(s => !['U', 'RA', 'SA', 'W', '-'].includes(s.grade)).length} Passing Result(s)
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleConfirm}
                        className="px-12 py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-[0_15px_40px_rgba(212,80,10,0.25)] flex items-center gap-3 group"
                    >
                        <FiZap className="group-hover:animate-pulse" />
                        Generate report
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
}
