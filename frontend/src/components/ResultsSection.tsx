'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiAward,
    FiTrendingUp,
    FiCheckCircle,
    FiPieChart,
    FiArrowLeft,
    FiDownload,
    FiShare2,
    FiStar,
    FiPackage,
    FiSettings,
    FiBriefcase,
    FiInfo,
    FiChevronUp,
    FiChevronDown,
    FiRefreshCw,
    FiHome,
    FiPlusSquare
} from 'react-icons/fi';
import confetti from 'canvas-confetti';
import WhatIfSimulator from './WhatIfSimulator';
import Odometer from './Odometer';

// Assuming subject type based on backend
interface SubjectDetail {
    grade: string;
    grade_points: number;
    credits: number;
    weighted: number;
    status: string;
    marks?: number;
    is_arrear?: boolean;
    original_semester?: number;
}

interface ResultsSectionProps {
    data: {
        gpa: number;
        cgpa: number;
        percentage: string;
        class: string;
        passed_subjects: number;
        failed_subjects?: number;
        total_subjects: number;
        current_semester_subjects?: number;
        arrear_subjects?: number;
        semester_credits?: number;
        total_credits?: number;
        semester_gpas?: Array<{ semester: number; gpa: number; credits: number }>;
        subjects: Record<string, SubjectDetail>;
        semester_info?: { semester?: number; regulation?: string };
    };
    onReset: () => void;
    mode?: 'single_sem' | 'multi_sem';
    context?: any;
}

const GRADE_THEMES: Record<string, { color: string, bg: string, border: string }> = {
    'O': { color: '#51A880', bg: 'bg-[#51A880]/10', border: 'border-[#51A880]/20' },
    'A+': { color: '#51A880', bg: 'bg-[#51A880]/10', border: 'border-[#51A880]/20' },
    'A': { color: '#4FA37D', bg: 'bg-[#4FA37D]/10', border: 'border-[#4FA37D]/20' },
    'B+': { color: '#D25419', bg: 'bg-[#FADFD0]/40', border: 'border-[#FADFD0]' },
    'B': { color: '#D25419', bg: 'bg-[#FADFD0]/30', border: 'border-[#FADFD0]/60' },
    'C': { color: '#89858E', bg: 'bg-[#89858E]/10', border: 'border-[#89858E]/20' },
    'U': { color: '#ef4444', bg: 'bg-red-50', border: 'border-red-100' },
    'RA': { color: '#ef4444', bg: 'bg-red-50', border: 'border-red-100' },
    'AB': { color: '#6b7280', bg: 'bg-gray-50', border: 'border-gray-100' },
};

export default function ResultsSection({ data, onReset, mode = 'single_sem', context }: ResultsSectionProps) {
    const [mounted, setMounted] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof SubjectDetail | 'code', direction: 'asc' | 'desc' } | null>(null);
    const [isSimOpen, setIsSimOpen] = useState(false);
    const [selectedSem, setSelectedSem] = useState<number | null>(null);

    const isSingle = mode === 'single_sem';

    const semesterGpas = useMemo(() => {
        if (isSingle) return [];

        // Preferred source: backend-computed semester GPAs.
        if (Array.isArray(data.semester_gpas) && data.semester_gpas.length > 0) {
            return [...data.semester_gpas]
                .map((s) => ({
                    sem: Number(s.semester),
                    gpa: Number(s.gpa) || 0,
                    credits: Number(s.credits) || 0,
                }))
                .filter((s) => s.sem > 0)
                .sort((a, b) => a.sem - b.sem);
        }

        // Fallback: derive from subject-level data.
        const semData: Record<number, { weighted: number; credits: number }> = {};
        Object.entries(data.subjects).forEach(([code, subj]) => {
            const sem = subj.original_semester || data.semester_info?.semester || 1;
            if (!semData[sem]) semData[sem] = { weighted: 0, credits: 0 };
            // use base grade_points * credits
            semData[sem].weighted += (subj.grade_points * subj.credits);
            semData[sem].credits += subj.credits;
        });
        
        const gpas: { sem: number; gpa: number; credits: number }[] = [];
        Object.keys(semData).sort((a,b)=>Number(a)-Number(b)).forEach(k => {
            const sem = Number(k);
            const vals = semData[sem];
            gpas.push({
                sem,
                gpa: vals.credits > 0 ? vals.weighted / vals.credits : 0,
                credits: vals.credits
            });
        });
        return gpas;
    }, [data.subjects, data.semester_gpas, isSingle, data.semester_info]);

    useEffect(() => {
        setMounted(true);
        if (data.cgpa >= 7.5 || data.class.toLowerCase().includes('distinction')) {
            setTimeout(() => {
                const duration = 3 * 1000;
                const animationEnd = Date.now() + duration;
                const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

                const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

                const interval: any = setInterval(function () {
                    const timeLeft = animationEnd - Date.now();
                    if (timeLeft <= 0) return clearInterval(interval);
                    const particleCount = 50 * (timeLeft / duration);
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                    confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
                }, 250);
            }, 1000); // Trigger shortly after render
        }
    }, [data.cgpa, data.class]);

    const subjectEntries = useMemo(() => {
        let entries = Object.entries(data.subjects);
        
        if (selectedSem !== null) {
            entries = entries.filter(([_, subj]) => (subj.original_semester || data.semester_info?.semester || 1) === selectedSem);
        }

        if (sortConfig) {
            entries.sort((a, b) => {
                const aVal = sortConfig.key === 'code' ? a[0] : (a[1] as any)[sortConfig.key];
                const bVal = sortConfig.key === 'code' ? b[0] : (b[1] as any)[sortConfig.key];
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return entries;
    }, [data.subjects, sortConfig, selectedSem, data.semester_info]);

    const highestGrade = useMemo(() => {
        let maxGradePoints = -1;
        let count = 0;
        let topGrade = 'C';
        
        Object.values(data.subjects).forEach((d) => {
            if (selectedSem !== null && (d.original_semester || data.semester_info?.semester || 1) !== selectedSem) return;
            if (d.grade_points > maxGradePoints) {
                maxGradePoints = d.grade_points;
                topGrade = d.grade;
                count = 1;
            } else if (d.grade_points === maxGradePoints) {
                count++;
            }
        });
        return `${topGrade} × ${count}`;
    }, [data.subjects, selectedSem, data.semester_info]);

    const currentArrearsCount = useMemo(() => {
        const failSet = new Set(['U', 'RA', 'AB', 'W', 'SA', 'F']);
        return Object.values(data.subjects || {}).filter((s) => failSet.has(String(s.grade || '').toUpperCase())).length;
    }, [data.subjects]);

    const primaryValue = isSingle ? data.gpa : data.cgpa;

    if (!mounted) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-5xl mx-auto pb-24 space-y-12"
        >
            {/* ── TOP NAV BAR ── */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 px-2">
                <button
                    onClick={onReset}
                    className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors font-bold uppercase tracking-widest text-xs"
                >
                    <FiArrowLeft className="text-lg" /> Back
                </button>
                <div className="text-center md:text-left">
                    <h2 className="text-xl font-black text-text-primary tracking-tight">
                        {isSingle ? `Semester ${data.semester_info?.semester || '?'} Result` : 'Cumulative Result'}
                    </h2>
                </div>
                <button className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors font-bold uppercase tracking-widest text-xs">
                    Share <FiShare2 className="text-lg" />
                </button>
            </div>

            {/* ── BLOCK 1: THE REVEAL (Saffron Glass Redesign) ── */}
            <div className="bg-gradient-to-br from-white via-[#FFFDFB] to-[#FDF4EF] rounded-[60px] pt-16 pb-24 px-8 md:px-16 shadow-[0_50px_100px_-20px_rgba(210,84,25,0.12),0_20px_40px_-15px_rgba(0,0,0,0.03),inset_0_1px_1px_rgba(255,255,255,0.9)] flex flex-col items-center justify-center relative overflow-hidden text-center mx-auto max-w-5xl border border-[#FADFD0]/60 group">
                {/* Texture Overlay */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(#D4500A 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

                {/* Glass Blobs */}
                <motion.div 
                    animate={{ 
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.6, 0.3],
                        x: [0, 40, 0],
                        y: [0, -30, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[400px] h-[400px] bg-[#D4500A]/5 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" 
                />
                <motion.div 
                    animate={{ 
                        scale: [1.3, 1, 1.3],
                        opacity: [0.2, 0.5, 0.2],
                        x: [0, -50, 0],
                        y: [0, 40, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-[#fadfd0]/30 rounded-full blur-[150px] pointer-events-none mix-blend-multiply" 
                />
                
                {data.class && (
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mb-16 px-6 py-2.5 bg-[#D4500A]/5 border border-[#D4500A]/20 rounded-full inline-flex items-center gap-2.5 text-[#D4500A] font-black uppercase tracking-[0.25em] text-[10px] shadow-[0_2px_10px_rgba(212,80,10,0.05)] backdrop-blur-sm"
                    >
                        <FiAward className="text-base text-[#D4500A]" /> {data.class.replace(' (WITH ARREAR HISTORY)', '').toUpperCase()}
                    </motion.div>
                )}

                {isSingle ? (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4, type: 'spring' }} className="relative z-20">
                        <div className="text-8xl md:text-[160px] font-black text-[#D4500A] tracking-tighter flex justify-center leading-none drop-shadow-[0_10px_30px_rgba(212,80,10,0.15)]">
                            <Odometer value={data.gpa} delay={0.8} />
                        </div>
                        <div className="text-[#1E293B] font-black text-xs md:text-sm uppercase tracking-[0.4em] mt-10 opacity-80">
                            Semester {data.semester_info?.semester || '?'} Performance
                        </div>
                        <div className="text-[#D4500A]/80 font-bold text-sm mt-2">{data.percentage}</div>
                    </motion.div>
                ) : (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4, type: 'spring' }} className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-16 md:gap-28 relative z-20 px-8">
                        <div className="text-center group">
                            <div className="text-7xl md:text-[110px] font-black text-[#D4500A] tracking-tighter flex justify-center leading-none drop-shadow-[0_8px_20px_rgba(212,80,10,0.12)]">
                                <Odometer value={data.cgpa} delay={0.8} />
                            </div>
                            <div className="mt-6">
                                <span className="text-[#D4500A]/60 font-black text-[10px] uppercase tracking-[0.3em]">Cumulative GPA</span>
                                <div className="text-[#D4500A]/80 font-bold text-xs mt-1">{data.percentage}</div>
                            </div>
                        </div>

                        {/* Grooved Divider */}
                        <div className="flex items-center justify-center h-32 hidden md:flex">
                            <div className="w-px h-full bg-[#1E293B]/10 shadow-[inner_0.5px_0_1px_rgba(0,0,0,0.05),_0.5px_0_1px_white] relative" />
                        </div>
                        <div className="w-48 h-px bg-[#1E293B]/10 shadow-[inner_0_0.5px_1px_rgba(0,0,0,0.05),_0_0.5px_1px_white] md:hidden relative" />

                        <div className="text-center group">
                            <div className="text-5xl md:text-6xl font-black text-[#1E293B] tracking-tight flex justify-center leading-none opacity-90">
                                <Odometer value={data.gpa} delay={1.4} />
                            </div>
                            <div className="text-[#1E293B]/60 font-black text-[10px] uppercase tracking-[0.3em] mt-5">Semester GPA</div>
                        </div>
                    </motion.div>
                )}

                <div className="text-[10px] font-black text-[#1E293B]/60 uppercase tracking-[0.3em] mt-16 group cursor-default">
                    Anna University <span className="mx-2 opacity-30">|</span> Regulation {data.semester_info?.regulation || '2021'}
                </div>

                {/* Monochrome Saffron Scale Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0 }}
                    className="w-full max-w-[800px] mt-16 relative mx-auto"
                >
                    <div className="h-[12px] w-full rounded-full bg-gradient-to-r from-[#FEE2D5] via-[#FDBA94] to-[#D4500A] relative flex items-center shadow-inner">
                        {/* Marker */}
                        <motion.div
                            initial={{ left: '0%' }}
                            animate={{ left: `${(primaryValue / 10) * 100}%` }}
                            transition={{ duration: 2, delay: 1.2, type: 'spring' }}
                            className="absolute top-1/2 -translate-y-1/2 w-[22px] h-[22px] -ml-[11px] z-20"
                        >
                            <div className="w-full h-full bg-white rounded-full shadow-lg border-[2px] border-[#D4500A] transition-transform relative hover:scale-125 cursor-pointer">
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#D4500A] text-white font-black px-2 py-1 rounded text-[10px] whitespace-nowrap shadow-xl">
                                    {primaryValue.toFixed(2)}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                    
                     {/* Milestone Labels (High Contrast) */}
                     <div className="relative w-full mt-6 h-10 text-[9px] font-black uppercase tracking-[0.25em]">
                        {/* Dynamic Highlighting with Monochrome Saffron Scale */}
                        <div className={`absolute left-0 transition-opacity duration-300 ${primaryValue < 5 ? 'text-[#D4500A] opacity-100' : 'text-[#1E293B] opacity-60'}`}>Fail</div>
                        
                        <div className={`absolute left-[50%] -translate-x-1/2 transition-opacity duration-300 ${primaryValue >= 5 && primaryValue < 7 ? 'text-[#D4500A] opacity-100' : 'text-[#1E293B] opacity-60'}`}>
                            Pass
                        </div>

                        <div className={`absolute left-[70%] -translate-x-1/2 transition-opacity duration-300 ${primaryValue >= 7 && primaryValue < 8.5 ? 'text-[#D4500A] opacity-100 drop-shadow-sm' : 'text-[#1E293B] opacity-60'}`}>
                            First
                        </div>

                        <div className={`absolute right-0 transition-opacity duration-300 ${primaryValue >= 8.5 ? 'text-[#D4500A] opacity-100' : 'text-[#1E293B] opacity-60'}`}>
                            Distinction
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* ── INTERACTIVE SEMESTER JOURNEY (MULTI SEM ONLY) ── */}
            {!isSingle && semesterGpas.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.1 }}
                    className="bg-white rounded-[40px] p-8 md:p-10 border border-[#FADFD0]/30 shadow-[0_15px_50px_-12px_rgba(210,84,25,0.03)]"
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-[#FADFD0]/50 flex items-center justify-center text-[#D25419]">
                                    <FiTrendingUp className="text-xl" />
                                </div>
                                <h3 className="font-black text-xl text-[#38352F] tracking-tight">Semester Journey</h3>
                            </div>
                            <p className="text-sm font-medium text-[#89858E] ml-13">Visualizing your performance across terms.</p>
                        </div>
                        {selectedSem && (
                            <button 
                                onClick={() => setSelectedSem(null)}
                                className="text-[10px] font-black uppercase tracking-widest text-[#D25419] hover:bg-[#FADFD0]/40 transition-colors flex items-center gap-2 bg-[#FADFD0]/20 px-4 py-2 rounded-full border border-[#FADFD0]/50"
                            >
                                <FiRefreshCw /> Reset View
                            </button>
                        )}
                    </div>

                    <div className="flex items-end justify-between gap-3 h-48 px-2">
                        {semesterGpas.map((item, i) => {
                            const isSelected = selectedSem === item.sem;
                            const heightPct = Math.max((item.gpa / 10) * 100, 10);
                            
                            let barStyle = "";
                            if (isSelected) {
                                barStyle = "bg-gradient-to-t from-[#D25419] to-[#FAD6A5] shadow-[0_8px_20px_-4px_rgba(210,84,25,0.4)]";
                            } else if (selectedSem === null) {
                                if (item.gpa >= 8.5) barStyle = "bg-gradient-to-t from-[#4FA37D] to-[#A0D8B4]";
                                else if (item.gpa >= 7.0) barStyle = "bg-gradient-to-t from-[#D25419] to-[#FAD6A5]";
                                else barStyle = "bg-gradient-to-t from-[#89858E] to-[#C0BFC4]";
                            } else {
                                barStyle = "bg-[#F3F1EF]"; // Dimmed
                            }

                            return (
                                <motion.div 
                                    key={item.sem}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: '100%', opacity: 1 }}
                                    transition={{ delay: 1.2 + (i * 0.1) }}
                                    className="flex-1 flex flex-col justify-end items-center group cursor-pointer relative h-full"
                                    onClick={() => setSelectedSem(isSelected ? null : item.sem)}
                                >
                                    <div className={`absolute -top-10 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 font-black text-xs px-2 py-1 bg-[#38352F] text-white rounded-md z-10 whitespace-nowrap`}>
                                        {item.gpa.toFixed(2)}
                                    </div>
                                    <div 
                                        className={`w-full max-w-[48px] rounded-t-2xl transition-all duration-500 overflow-hidden relative ${barStyle}`} 
                                        style={{ height: `${heightPct}%` }}
                                    >
                                        <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 blur-sm" />
                                    </div>
                                    <div className={`mt-4 text-[10px] font-black uppercase tracking-[0.15em] transition-colors ${isSelected ? 'text-[#D25419]' : 'text-[#89858E]'}`}>
                                        S{item.sem}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>
                </motion.div>
            )}

            {/* ── BLOCK 2: STATS TILES ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
                {isSingle ? (
                    <>
                        <StatTile label="Credits Earned" value={data.semester_credits?.toString() || '-'} sub="This Semester" />
                        <StatTile label="Subjects" value={data.current_semester_subjects?.toString() || data.total_subjects.toString()} sub="Total Attempted" />
                        <StatTile label="Arrears" value={currentArrearsCount.toString()} sub={currentArrearsCount ? 'Needs Attention' : 'Clean!'} highlight={currentArrearsCount === 0 ? 'success' : 'danger'} />
                        <StatTile label="Highest" value={highestGrade} sub="Grade Achieved" highlight="primary" />
                    </>
                ) : (
                    <>
                        {selectedSem ? (
                            <>
                                <StatTile label="Sem Credits" value={semesterGpas.find(s=>s.sem===selectedSem)?.credits?.toString() || '-'} sub={`Semester ${selectedSem}`} />
                                <StatTile label="Sem Subjects" value={subjectEntries.length.toString()} sub="Attempted" />
                                <StatTile label="Sem Arrears" value={subjectEntries.filter(s=>{
                                    // Only count as arrear if still failing AND no later passing grade exists
                                    if (!['U','RA','AB'].includes(s[1].grade)) return false;
                                    
                                    // Check if this subject was cleared in consolidated data
                                    const subjectCode = s[0];
                                    const allSubjects = Object.entries(data.subjects || {});
                                    const sameSubject = allSubjects.find(([code]) => code === subjectCode);
                                    
                                    // If we found the subject in consolidated data and it's passing, don't count as arrear
                                    if (sameSubject && !['U','RA','AB'].includes(sameSubject[1].grade)) {
                                        return false;
                                    }
                                    
                                    return true;
                                }).length.toString()} sub="Uncleared" highlight={subjectEntries.filter(s=>{
                                    if (!['U','RA','AB'].includes(s[1].grade)) return false;
                                    const subjectCode = s[0];
                                    const allSubjects = Object.entries(data.subjects || {});
                                    const sameSubject = allSubjects.find(([code]) => code === subjectCode);
                                    if (sameSubject && !['U','RA','AB'].includes(sameSubject[1].grade)) {
                                        return false;
                                    }
                                    return true;
                                }).length === 0 ? 'success' : 'danger'} />
                                <StatTile label="Sem GPA" value={semesterGpas.find(s=>s.sem===selectedSem)?.gpa.toFixed(2) || '0.00'} sub="Achieved" highlight="primary" />
                            </>
                        ) : (
                            <>
                                <StatTile label="Total Credits" value={data.total_credits?.toString() || '-'} sub="Earned so far" />
                                <StatTile label="Total Subjects" value={data.total_subjects.toString()} sub="Analyzed" />
                                <StatTile label="Total Arrears" value={currentArrearsCount.toString()} sub={currentArrearsCount ? 'Uncleared' : 'All Cleared!'} highlight={currentArrearsCount === 0 ? 'success' : 'danger'} />
                                <StatTile label="Percentage" value={data.percentage} sub="Overall Score" highlight="primary" />
                            </>
                        )}
                    </>
                )}
            </motion.div>

            {/* ── BLOCK 3: SUBJECT BREAKDOWN TABLE ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 }}
                className="bg-white border border-[#FADFD0]/40 rounded-[40px] overflow-hidden shadow-[0_20px_60px_-15px_rgba(210,84,25,0.05)]"
            >
                <div className="p-8 border-b border-[#FADFD0]/40 flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#FADFD0]/40 flex items-center justify-center text-[#D25419] text-2xl shadow-sm">
                        <FiPackage />
                    </div>
                    <div>
                        <h3 className="font-black text-2xl text-[#38352F] tracking-tight">Subject Analysis</h3>
                        <p className="text-[#89858E] text-sm font-medium">Detailed breakdown of your academic results.</p>
                    </div>
                </div>
                
                <div className="overflow-x-auto w-full custom-scrollbar">
                    <table className="w-full text-left min-w-[800px] border-collapse">
                        <thead>
                            <tr className="bg-[#F3F1EF]/30 border-b border-[#FADFD0]/40">
                                <th className="py-5 px-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#89858E]">No.</th>
                                <th 
                                    className="py-5 px-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#89858E] cursor-pointer hover:text-[#D25419] transition-colors"
                                    onClick={() => setSortConfig({ key: 'code', direction: sortConfig?.key === 'code' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                                >
                                    <div className="flex items-center gap-2">
                                        Subject {sortConfig?.key === 'code' && (sortConfig.direction === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                                    </div>
                                </th>
                                <th className="py-5 px-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#89858E]">Grade</th>
                                <th className="py-5 px-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#89858E] text-right">Points</th>
                                <th className="py-5 px-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#89858E] text-right">Credits</th>
                                <th className="py-5 px-8 text-[11px] font-black uppercase tracking-[0.2em] text-[#89858E] text-right">Weighted</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#FADFD0]/20">
                            {subjectEntries.map(([code, subj], i) => {
                                const theme = GRADE_THEMES[subj.grade.toUpperCase()] || GRADE_THEMES['C'];
                                return (
                                    <tr key={code} className="hover:bg-[#FADFD0]/10 transition-colors group">
                                        <td className="py-6 px-8 text-sm font-bold text-[#89858E]">{String(i + 1).padStart(2, '0')}</td>
                                        <td className="py-6 px-8">
                                            <div className="font-black text-[#38352F] text-lg group-hover:text-[#D25419] transition-colors">{code}</div>
                                            {/* Check if this failing subject was actually cleared in consolidated data */}
                                            {['U', 'RA', 'AB'].includes(subj.grade) && data.subjects && data.subjects[code] && !['U', 'RA', 'AB'].includes(data.subjects[code].grade) ? (
                                                <div className="text-[10px] font-black text-green-600/70 tracking-[0.15em] uppercase mt-1">
                                                    Cleared ({data.subjects[code].grade})
                                                </div>
                                            ) : subj.is_arrear ? (
                                                <div className="text-[10px] font-black text-[#D4500A]/70 tracking-[0.15em] uppercase mt-1">
                                                    Arrear History
                                                </div>
                                            ) : (!isSingle && subj.original_semester) ? (
                                                <div className="text-[10px] font-black text-[#1E293B]/50 tracking-[0.15em] uppercase mt-1">
                                                    Semester {subj.original_semester}
                                                </div>
                                            ) : null}
                                        </td>
                                        <td className="py-6 px-8">
                                            <span className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-[0.1em] ${theme.bg} ${theme.border} border uppercase inline-block shadow-sm`} style={{ color: theme.color }}>
                                                {subj.grade}
                                            </span>
                                        </td>
                                        <td className="py-6 px-8 text-right text-sm font-black text-[#89858E]">{subj.grade_points.toFixed(1)}</td>
                                        <td className="py-6 px-8 text-right text-sm font-black text-[#89858E]">{subj.credits}</td>
                                        <td className="py-6 px-8 text-right text-lg font-black text-[#38352F]">{subj.weighted.toFixed(1)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* ── BLOCK 4: WHAT-IF SIMULATOR ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6 }}
                className="bg-bg-card border border-border rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group"
            >
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🧪</span>
                        <h3 className="font-black text-xl text-text-primary tracking-tight">What if you had scored differently?</h3>
                    </div>
                    <p className="text-text-muted text-sm font-medium">Test hypothetical grades to see how your {isSingle ? 'GPA' : 'Overall CGPA'} would change.</p>
                </div>
                <button 
                    onClick={() => setIsSimOpen(true)}
                    className="px-6 py-3 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 shrink-0 relative z-10"
                >
                    <FiSettings className="text-lg" /> Launch Simulator
                </button>
            </motion.div>

            <AnimatePresence>
                {isSimOpen && (
                    <WhatIfSimulator 
                        isOpen={isSimOpen} 
                        initialSubjects={data.subjects} 
                        currentGpa={isSingle ? data.gpa : data.cgpa}
                        isSingle={isSingle}
                        onClose={() => setIsSimOpen(false)} 
                    />
                )}
            </AnimatePresence>

            {/* ── BLOCK 5: SMART NEXT STEP ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 }}
                className="bg-bg-card-alt border border-border rounded-[32px] p-8 md:p-12 text-center"
            >
                <h3 className="text-xl font-black text-text-primary tracking-tight mb-2">What would you like to do next?</h3>
                
                {isSingle ? (
                    <p className="text-text-muted font-medium mb-8">Want to see your full CGPA? Add your other semesters to see the complete picture.</p>
                ) : (
                    <p className="text-text-muted font-medium mb-8">Your cumulative performance is saved. You can add more semesters or export your report.</p>
                )}

                <div className="flex flex-col sm:flex-row justify-center gap-4">
                    {isSingle && (context?.files?.length === 1 || Object.keys(context?.gradesData || {}).length === 1) && (
                         <button onClick={onReset} className="px-8 py-4 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                            <FiPlusSquare className="text-lg" /> Add Another Semester
                        </button>
                    )}
                    
                    <button className="px-8 py-4 bg-bg-card border border-border text-text-primary rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-border/50 transition-colors">
                        <FiDownload className="text-lg" /> Export PDF
                    </button>
                    
                    <button onClick={onReset} className="px-8 py-4 bg-bg-card border border-border text-text-muted hover:text-text-primary rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-border/50 transition-colors">
                        <FiHome className="text-lg" /> Go Home
                    </button>
                </div>
            </motion.div>
            
        </motion.div>
    );
}

function StatTile({ label, value, sub, highlight }: { label: string, value: string, sub: string, highlight?: 'primary' | 'success' | 'danger' }) {
    let textClass = "text-[#38352F]";
    let dotColor = "bg-[#89858E]";
    let bgTint = "bg-white";
    let borderTint = "border-[#FADFD0]/40";

    if (highlight === 'primary') {
        textClass = "text-[#D25419]";
        dotColor = "bg-[#D25419]";
        bgTint = "bg-[#FADFD0]/10";
        borderTint = "border-[#FADFD0]";
    }
    if (highlight === 'success') {
        textClass = "text-[#4FA37D]";
        dotColor = "bg-[#4FA37D]";
    }
    if (highlight === 'danger') {
        textClass = "text-[#ef4444]";
        dotColor = "bg-[#ef4444]";
    }

    return (
        <div className={`relative overflow-hidden ${bgTint} border ${borderTint} rounded-[32px] p-7 flex flex-col items-center justify-center transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_15px_40px_-10px_rgba(210,84,25,0.06)] group shadow-sm`}>
            <div className={`absolute top-0 right-0 w-24 h-24 ${highlight === 'primary' ? 'bg-[#D25419]/5' : 'bg-[#89858E]/5'} rounded-full -mr-12 -mt-12 transition-transform duration-700 group-hover:scale-150`} />
            
            <div className="flex items-center gap-2 mb-3">
                <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                <div className="text-[10px] font-black text-[#89858E] uppercase tracking-[0.2em]">{label}</div>
            </div>
            
            <div className={`text-4xl md:text-5xl font-black tracking-tight mb-2 ${textClass} relative z-10`}>{value}</div>
            
            <div className="text-[10px] font-bold text-[#89858E]/60 uppercase tracking-[0.1em]">{sub}</div>
        </div>
    );
}
