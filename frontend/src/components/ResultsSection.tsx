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
    FiRefreshCw
} from 'react-icons/fi';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip
} from 'recharts';
import confetti from 'canvas-confetti';
import WhatIfSimulator from './WhatIfSimulator';
import PlacementEligiblityCard from './PlacementEligiblityCard';
import Odometer from './Odometer';

interface SubjectDetail {
    grade: string;
    grade_points: number;
    credits: number;
    weighted: number;
    marks?: number;
    is_arrear?: boolean;
    is_revaluation?: boolean;
}

interface ResultsSectionProps {
    data: {
        gpa: number;
        cgpa: number;
        percentage: string;
        class: string;
        passed_subjects: number;
        total_subjects: number;
        subjects: Record<string, SubjectDetail>;
        confidence?: { overall?: number };
        semester_info?: { semester?: number; regulation?: string };
    };
    onReset: () => void;
}

const GRADE_THEMES: Record<string, { color: string; bg: string; border: string }> = {
    'O': { color: 'var(--color-success)', bg: 'bg-success/10', border: 'border-success/20' },
    'A+': { color: 'var(--color-primary)', bg: 'bg-primary/10', border: 'border-primary/20' },
    'A': { color: 'var(--color-primary)', bg: 'bg-primary/10', border: 'border-primary/20' },
    'B+': { color: 'var(--color-accent-1)', bg: 'bg-accent-1/10', border: 'border-accent-1/20' },
    'B': { color: 'var(--color-accent-1)', bg: 'bg-accent-1/10', border: 'border-accent-1/20' },
    'C': { color: 'var(--color-neutral)', bg: 'bg-neutral/10', border: 'border-neutral/20' },
    'R': { color: 'var(--color-accent-2)', bg: 'bg-accent-2/10', border: 'border-accent-2/20' },
    'U': { color: 'var(--color-accent-2)', bg: 'bg-accent-2/10', border: 'border-accent-2/20' },
    'RA': { color: 'var(--color-accent-2)', bg: 'bg-accent-2/10', border: 'border-accent-2/20' },
};

export default function ResultsSection({ data, onReset }: ResultsSectionProps) {
    const [mounted, setMounted] = useState(false);
    const [isSimOpen, setIsSimOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: keyof SubjectDetail | 'code', direction: 'asc' | 'desc' } | null>(null);

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
            }, 3000); // Trigger after odometer roll
        }
    }, [data.cgpa, data.class]);

    const chartData = useMemo(() => {
        // Mocking a growth trend based on the current CGPA for visualization
        const base = data.cgpa * 0.8;
        return [
            { name: 'Sem 1', val: base },
            { name: 'Sem 2', val: base + (data.cgpa - base) * 0.3 },
            { name: 'Sem 3', val: base + (data.cgpa - base) * 0.6 },
            { name: 'Current', val: data.cgpa },
        ];
    }, [data.cgpa]);

    const subjectEntries = useMemo(() => {
        let entries = Object.entries(data.subjects);
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
    }, [data.subjects, sortConfig]);

    const highestWeightedCode = useMemo(() => {
        let max = -1;
        let code = '';
        Object.entries(data.subjects).forEach(([c, d]) => {
            if (d.weighted > max) {
                max = d.weighted;
                code = c;
            }
        });
        return code;
    }, [data.subjects]);

    const passedCount = Object.values(data.subjects).filter((d) => !['U', 'RA', 'SA', 'W', 'AB'].includes(d.grade)).length;
    const passRate = (passedCount / (Object.keys(data.subjects).length || 1)) * 100;

    if (!mounted) return null;

    // 0.0s - Pearl Background fades in (implicit via CSS)
    // 0.6s - Classification Banner drops
    // 0.9s - CGPA Hero scales up
    // 1.2s - Stats slide in
    // 1.6s - Chart draws
    // 2.0s - Action buttons fade up

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-7xl mx-auto px-4 pb-24 space-y-12"
        >
            {/* Top Toolbar (2.0s Fadeup) */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.0 }}
                className="flex flex-col md:flex-row items-center justify-between gap-6"
            >
                <div className="flex items-center gap-4">
                    <button
                        onClick={onReset}
                        className="p-3 bg-bg-card border border-border rounded-2xl text-text-muted hover:text-primary hover:border-primary/30 transition-all shadow-sm group"
                    >
                        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <h2 className="text-3xl font-black text-text-primary tracking-tighter">Academic <span className="text-primary">Intelligence</span></h2>
                        <div className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-widest mt-1">
                            <FiPackage className="text-primary" />
                            <span>Report Generated Successfully</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="px-6 py-3 bg-bg-card border border-border rounded-2xl font-bold text-text-primary hover:bg-bg-card-alt transition-colors flex items-center gap-2">
                        <FiDownload /> Export PDF
                    </button>
                    <button
                        onClick={() => setIsSimOpen(true)}
                        className="px-6 py-3 bg-bg-card border border-border rounded-2xl font-bold text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-2 group"
                    >
                        <FiSettings className="group-hover:rotate-180 transition-transform duration-500" /> Grade Simulator
                    </button>
                    <button className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                        <FiShare2 /> Share Result
                    </button>
                </div>
            </motion.div>

            {/* 0.6s - Classification Banner (Ribbon Drop) */}
            <div className="flex justify-center">
                <motion.div
                    initial={{ y: -100, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, type: 'spring', damping: 15 }}
                    className="relative px-12 py-4 bg-gradient-to-r from-primary to-accent-1 rounded-full shadow-2xl shadow-primary/20 flex items-center gap-4 overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
                    <FiAward className="text-white text-3xl animate-float" />
                    <div className="relative">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70 leading-none mb-1">Classification Unlock</p>
                        <h3 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">{data.class}</h3>
                    </div>
                </motion.div>
            </div>

            {/* Main Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 auto-rows-[200px] gap-6">

                {/* 0.9s - Hero CGPA Card (Variation: Odometer + Pulse) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9, type: 'spring', damping: 20 }}
                    className="md:col-span-8 md:row-span-2 relative rounded-[48px] p-1 bg-gradient-to-br from-primary via-primary/50 to-accent-1 shadow-2xl shadow-primary/20"
                >
                    <div className="bg-bg-card w-full h-full rounded-[47px] overflow-hidden flex flex-col md:flex-row p-10 md:p-14 gap-12">
                        <div className="flex-1 space-y-10">
                            <div className="space-y-4">
                                <div className="px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full w-fit flex items-center gap-2">
                                    <FiTrendingUp className="text-primary" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Cumulative Performance</span>
                                </div>

                                <div className="relative">
                                    <div className="text-7xl md:text-9xl relative z-10 text-data">
                                        <Odometer value={data.cgpa} delay={1.1} />
                                    </div>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: [0, 1, 0] }}
                                        transition={{ delay: 3.1, duration: 2, repeat: Infinity }}
                                        className="absolute top-1/2 left-1/4 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-3xl"
                                    />
                                </div>

                                <p className="text-text-muted font-bold text-xl ml-2">Overall CGPA Score</p>
                            </div>

                            <div className="pt-6 flex items-center gap-12">
                                <div>
                                    <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-1.5">Percentage</div>
                                    <div className="text-3xl font-black text-data tracking-tight">{data.percentage}%</div>
                                </div>
                                <div className="w-px h-12 bg-border"></div>
                                <div>
                                    <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-1.5">Cleared</div>
                                    <div className="text-3xl font-black text-success tracking-tight">{passedCount}/{subjectEntries.length}</div>
                                </div>
                            </div>
                        </div>

                        {/* 1.6s - Chart (Variation: Glow Line) */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1.6 }}
                            className="w-full md:w-[320px] h-full flex items-center justify-center bg-bg-card-alt/30 rounded-[32px] p-4 relative"
                        >
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#D4500A" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#D4500A" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" hide />
                                    <YAxis hide domain={[0, 10]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px rgba(124,58,237,0.15)' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="val"
                                        stroke="#D4500A"
                                        strokeWidth={6}
                                        fillOpacity={1}
                                        fill="url(#colorVal)"
                                        animationDuration={2500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                            <div className="absolute top-6 left-6 text-[10px] font-black text-primary uppercase tracking-widest bg-bg-card/80 backdrop-blur px-3 py-1 rounded-full border border-primary/20">
                                Trend Analysis
                            </div>
                        </motion.div>
                    </div>
                </motion.div>

                {/* 1.2s - Stat Cards (Staggered slide-in) */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 }}
                    className="md:col-span-4 md:row-span-1 glass-glow rounded-[40px] p-8 border border-border flex flex-col justify-between group hover:border-primary/30 transition-all duration-500 overflow-hidden relative"
                >
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex justify-between items-start">
                        <div className="w-14 h-14 rounded-2xl bg-accent-1/10 flex items-center justify-center text-accent-1 text-2xl shadow-inner group-hover:scale-110 transition-transform">
                            <FiStar />
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-black text-text-muted uppercase tracking-widest mb-1.5">Semester GPA</div>
                            <div className="text-5xl font-black text-text-primary tabular-nums">{data.gpa.toFixed(2)}</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.3 }}
                    className="md:col-span-4 md:row-span-1 glass-glow rounded-[40px] p-8 border border-border flex flex-col justify-between group hover:border-success/30 transition-all duration-500 relative"
                >
                    <div className="flex justify-between items-center h-full">
                        <div className="space-y-1">
                            <div className="text-xs font-black text-text-muted uppercase tracking-widest">Clearance Rate</div>
                            <div className="text-5xl font-black text-text-primary tabular-nums">{Math.round(passRate)}%</div>
                            <div className="text-[10px] font-black text-success uppercase tracking-widest flex items-center gap-1.5 pt-2">
                                <FiCheckCircle /> Perfect Record
                            </div>
                        </div>
                        <div className="relative w-24 h-24">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path className="text-border" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                                <motion.path
                                    initial={{ strokeDasharray: "0, 100" }}
                                    animate={{ strokeDasharray: `${passRate}, 100` }}
                                    transition={{ duration: 2, delay: 1.5, ease: "easeOut" }}
                                    className="text-success" strokeDasharray={`${passRate}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round"
                                />
                            </svg>
                        </div>
                    </div>
                </motion.div>

                {/* Performance Scale (The Journey) */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.7 }}
                    className="md:col-span-12 md:row-span-1 glass-glow rounded-[40px] p-10 border border-border flex flex-col justify-center gap-8"
                >
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl">
                                <FiTrendingUp />
                            </div>
                            <div>
                                <h4 className="font-black text-text-primary tracking-tight">Academic Journey Scale</h4>
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-0.5">Where you stand among regulations</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-text-muted">YOU ARE HERE</span>
                            <div className="w-2 h-2 rounded-full bg-primary animate-ping-custom" />
                        </div>
                    </div>

                    <div className="relative pt-6 pb-2">
                        {/* Scale Track */}
                        <div className="h-4 w-full rounded-full bg-gradient-to-r from-accent-2 via-accent-1 to-success relative overflow-hidden shadow-inner">
                            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                        </div>

                        {/* Scale Marker */}
                        <motion.div
                            initial={{ left: '0%' }}
                            animate={{ left: `${(data.cgpa / 10) * 100}%` }}
                            transition={{ duration: 2, delay: 2, type: 'spring' }}
                            className="absolute top-1/2 -translate-y-1/2 w-10 h-10 -ml-5 z-20 group"
                        >
                            <div className="w-full h-full bg-bg-card rounded-full p-2 shadow-xl border-4 border-primary group-hover:scale-125 transition-transform duration-300 relative">
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-2 py-1 rounded-md">
                                    {data.cgpa.toFixed(2)}
                                </div>
                            </div>
                        </motion.div>

                        {/* Labels */}
                        <div className="flex justify-between mt-6 px-2 text-[10px] font-black text-text-muted uppercase tracking-wider">
                            <div className="flex flex-col items-center"><span>0.0</span><span className="mt-1">NIL</span></div>
                            <div className="flex flex-col items-center"><span>5.0</span><span className="mt-1 text-accent-1">PASS</span></div>
                            <div className="flex flex-col items-center"><span>6.0</span><span className="mt-1">SECOND</span></div>
                            <div className="flex flex-col items-center"><span>7.0</span><span className="mt-1 text-primary">FIRST</span></div>
                            <div className="flex flex-col items-center"><span>9.0</span><span className="mt-1 text-success">HONORS</span></div>
                            <div className="flex flex-col items-center"><span>10.0</span><span className="mt-1">MAX</span></div>
                        </div>
                    </div>
                </motion.div>

                {/* Career Eligibility & Table (Existing Bento) */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.9 }}
                    className="md:col-span-12 md:row-span-2 glass-glow rounded-[40px] p-10 border border-border"
                >
                    <PlacementEligiblityCard cgpa={data.cgpa} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.1 }}
                    className="md:col-span-12 md:row-span-3 glass-glow rounded-[40px] p-12 border border-border flex flex-col gap-10"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary text-3xl">
                                <FiAward />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-text-primary tracking-tight">Academic Breakdown</h4>
                                <p className="text-text-muted font-bold text-sm">Sorted by weighted performance score</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="px-5 py-2 rounded-2xl bg-bg-card-alt border border-border flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">GPA CONTRIBUTION</span>
                            </div>
                            <div className="px-5 py-2 rounded-2xl bg-bg-card-alt border border-border flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-accent-2" />
                                <span className="text-[10px] font-black text-text-primary uppercase tracking-widest">CGPA Only</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto -mx-12 px-12 custom-scrollbar pb-4">
                        <table className="w-full text-left min-w-[900px]">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="pb-8 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted">Type</th>
                                    <th
                                        className="pb-8 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted cursor-pointer hover:text-primary transition-colors group"
                                        onClick={() => setSortConfig({ key: 'code', direction: sortConfig?.key === 'code' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                                    >
                                        <div className="flex items-center gap-2">
                                            Subject {sortConfig?.key === 'code' && (sortConfig.direction === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                                        </div>
                                    </th>
                                    <th className="pb-8 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted text-center">Grade</th>
                                    <th className="pb-8 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted text-center">Points</th>
                                    <th className="pb-8 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted text-center">Credits</th>
                                    <th
                                        className="pb-8 text-[11px] font-black uppercase tracking-[0.2em] text-text-muted text-right cursor-pointer hover:text-primary transition-colors pr-8 group"
                                        onClick={() => setSortConfig({ key: 'weighted', direction: sortConfig?.key === 'weighted' && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
                                    >
                                        <div className="flex items-center justify-end gap-2 text-primary">
                                            Weighted Point {sortConfig?.key === 'weighted' && (sortConfig.direction === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {subjectEntries.map(([code, det], idx) => {
                                    const isGpaScope = !det.is_arrear && !det.is_revaluation;
                                    const theme = GRADE_THEMES[det.grade as keyof typeof GRADE_THEMES] || GRADE_THEMES['C'];
                                    const isBest = code === highestWeightedCode;

                                    return (
                                        <motion.tr
                                            key={code}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 2.3 + idx * 0.05 }}
                                            className={`group transition-all ${isBest ? 'bg-accent-1/5' : 'hover:bg-bg-card-alt/30'}`}
                                        >
                                            <td className="py-8">
                                                <div className={`w-2 h-10 rounded-full ${isGpaScope ? 'bg-primary shadow-[0_0_12px_rgba(124,58,237,0.4)]' : 'bg-accent-2'}`} />
                                            </td>
                                            <td className="py-8 pr-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="font-black text-text-primary text-lg tracking-tight">{code}</div>
                                                    {isBest && <span className="px-2 py-0.5 bg-accent-1 text-white text-[9px] font-black rounded-md uppercase tracking-widest">HIGHEST</span>}
                                                </div>
                                                <div className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-1.5 flex items-center gap-2">
                                                    {isGpaScope ? <><FiCheckCircle className="text-primary" /> GPA CONTRIBUTION</> : <><FiInfo className="text-accent-2" /> CGPA ADJUSTMENT</>}
                                                </div>
                                            </td>
                                            <td className="py-8 text-center">
                                                <span className={`px-6 py-2 rounded-2xl border-2 text-xs font-black transition-all ${theme.bg} ${theme.border} group-hover:scale-110 group-hover:shadow-lg inline-block min-w-[3.5rem]`} style={{ color: theme.color }}>
                                                    {det.grade}
                                                </span>
                                            </td>
                                            <td className="py-8 text-center font-black text-text-primary font-mono text-lg">{det.grade_points}</td>
                                            <td className="py-8 text-center font-black text-text-muted font-mono">{det.credits}</td>
                                            <td className="py-8 text-right font-black text-data font-mono pr-8 text-2xl group-hover:scale-105 transition-transform">
                                                {det.weighted}
                                            </td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>

            {/* Action Bar (Sticky Footer) */}
            <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ delay: 2.5, type: 'spring', damping: 20 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 w-fit px-8 py-4 bg-bg-card/80 backdrop-blur-2xl border border-primary/20 rounded-[32px] shadow-2xl z-[50] flex items-center gap-4 border-b-4 border-b-primary/40"
            >
                <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] px-4 border-r border-border mr-2">Results Finalized</div>
                <button onClick={onReset} className="px-6 py-3 hover:bg-bg-card-alt rounded-2xl font-black text-text-primary transition-all flex items-center gap-2 text-sm group">
                    <FiRefreshCw className="group-hover:rotate-180 transition-transform duration-500" /> NEW CALCULATION
                </button>
                <div className="w-px h-6 bg-border mx-2" />
                <button className="px-8 py-3 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-sm">
                    DOWNLOAD PDF
                </button>
            </motion.div>

            {/* Simulator Modal */}
            <AnimatePresence>
                {isSimOpen && (
                    <WhatIfSimulator
                        isOpen={isSimOpen}
                        initialSubjects={Object.fromEntries(
                            Object.entries(data.subjects).map(([code, det]) => [code, { grade: det.grade, credits: det.credits }])
                        )}
                        onClose={() => setIsSimOpen(false)}
                    />
                )}
            </AnimatePresence>
        </motion.div>
    );
}
