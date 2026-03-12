'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiX,
    FiRefreshCw,
    FiCheck,
    FiTrendingUp,
    FiAlertCircle,
    FiArrowRight,
    FiChevronRight,
    FiZap
} from 'react-icons/fi';

interface SubjectSim {
    grade: string;
    credits: number;
}

interface WhatIfSimulatorProps {
    isOpen: boolean;
    initialSubjects: Record<string, SubjectSim>;
    currentGpa: number;
    isSingle: boolean;
    onClose: () => void;
}

const GRADE_POINTS: Record<string, number> = {
    'S': 10, 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 5, 'D': 4, 'E': 3, 'U': 0, 'RA': 0, 'SA': 0, 'W': 0, 'AB': 0, 'F': 0, 'FE': 0, 'NC': 0
};

export default function WhatIfSimulator({ isOpen, initialSubjects, currentGpa, isSingle, onClose }: WhatIfSimulatorProps) {
    const [simulatedGrades, setSimulatedGrades] = useState<Record<string, string>>(
        Object.fromEntries(Object.entries(initialSubjects).map(([code, det]) => [code, det.grade]))
    );

    const calculateMetrics = (grades: Record<string, string>) => {
        let totalWeighted = 0;
        let totalCredits = 0;
        Object.entries(grades).forEach(([code, grade]) => {
            const credits = initialSubjects[code]?.credits || 0;
            const points = GRADE_POINTS[grade] || 0;
            
            // Anna University Formula: CGPA = Σ(Ci × GPi) / ΣCi
            // ALL subjects contribute to denominator (including failed with 0 points)
            totalWeighted += points * credits;
            totalCredits += credits;
        });
        return totalCredits > 0 ? totalWeighted / totalCredits : 0;
    };

    // Use backend-calculated GPA as the "Current" value for consistency
    // Only use frontend calculation for the "Simulated" value
    const simulatedGpa = useMemo(() => calculateMetrics(simulatedGrades), [simulatedGrades, initialSubjects, isSingle]);
    const diff = simulatedGpa - currentGpa;

    const handleGradeChange = (code: string, newGrade: string) => {
        setSimulatedGrades(prev => ({ ...prev, [code]: newGrade }));
    };

    const handleReset = () => {
        setSimulatedGrades(Object.fromEntries(Object.entries(initialSubjects).map(([code, det]) => [code, det.grade])));
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8"
        >
            <div className="absolute inset-0 bg-text-primary/10 backdrop-blur-md" onClick={onClose} />

            <motion.div
                layoutId="simulator-panel"
                className="relative w-full max-w-5xl bg-bg-card rounded-[40px] shadow-2xl overflow-hidden border border-border flex flex-col md:flex-row h-full max-h-[85vh]"
            >
                {/* Left: Interactive Controls */}
                <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar space-y-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-xl">
                                    <FiZap />
                                </div>
                                <h2 className="text-3xl font-black text-text-primary tracking-tighter">Grade <span className="text-primary">Simulator</span></h2>
                            </div>
                            <p className="text-text-muted font-bold text-sm">Hypothetical analysis: Adjust your grades to see {isSingle ? 'GPA' : 'CGPA'} impact</p>
                        </div>
                        <button
                            onClick={handleReset}
                            className="p-3 hover:bg-bg-card-alt rounded-2xl text-text-muted hover:text-primary transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest"
                        >
                            <FiRefreshCw /> Reset
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(initialSubjects).map(([code, det]) => (
                            <div key={code} className="p-6 rounded-3xl bg-bg-card-alt border border-border group hover:border-primary/30 transition-all flex items-center justify-between">
                                <div>
                                    <div className="font-black text-text-primary mb-1">{code}</div>
                                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{det.credits} Credits</div>
                                </div>
                                <select
                                    value={simulatedGrades[code]}
                                    onChange={(e) => handleGradeChange(code, e.target.value)}
                                    className="bg-bg-card border-2 border-border rounded-xl px-4 py-2 font-black text-primary focus:border-primary focus:outline-none transition-all cursor-pointer hover:bg-primary/5"
                                >
                                    {Object.keys(GRADE_POINTS).filter(g => g !== 'SA' && g !== 'W' && g !== 'AB').map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Results Dashboard */}
                <div className="w-full md:w-[380px] bg-bg-primary p-8 md:p-12 flex flex-col justify-between border-l border-border relative">
                    <div className="absolute top-8 right-8">
                        <button onClick={onClose} className="p-3 hover:bg-bg-card rounded-2xl text-text-muted hover:text-accent-2 transition-all">
                            <FiX size={24} />
                        </button>
                    </div>

                    <div className="space-y-12">
                        <div className="space-y-6">
                            <div className="text-xs font-black text-text-muted uppercase tracking-[0.2em]">Simulation Results</div>

                            <div className="space-y-2">
                                <div className="text-6xl font-black text-text-primary tracking-tighter tabular-nums">
                                    {Math.abs(diff) < 0.01 ? simulatedGpa.toFixed(3) : simulatedGpa.toFixed(2)}
                                </div>
                                <div className="text-sm font-bold text-text-muted">Simulated {isSingle ? 'Semester GPA' : 'Cumulative CGPA'}</div>
                            </div>

                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest border-2 ${Math.abs(diff) < 0.001 ? 'bg-bg-card border-border text-text-muted' : diff > 0 ? 'bg-success/10 border-success/20 text-success' : 'bg-accent-2/10 border-accent-2/20 text-accent-2'}`}>
                                {Math.abs(diff) < 0.001 ? <FiCheck /> : diff > 0 ? <FiTrendingUp /> : <FiAlertCircle />}
                                {diff > 0.0005 ? '+' : ''}{diff.toFixed(3)} Net Change
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="p-6 rounded-3xl bg-bg-card border border-border space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black text-text-muted uppercase tracking-widest">
                                    <span>Current</span>
                                    <span>Simulated</span>
                                </div>
                                <div className="flex items-center gap-4 text-center">
                                    <div className="text-2xl font-black text-text-muted">
                                        {Math.abs(diff) < 0.01 ? currentGpa.toFixed(3) : currentGpa.toFixed(2)}
                                    </div>
                                    <FiArrowRight className="text-primary text-xl" />
                                    <div className="text-2xl font-black text-primary">
                                        {Math.abs(diff) < 0.01 ? simulatedGpa.toFixed(3) : simulatedGpa.toFixed(2)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-center text-xs font-bold opacity-60">
                                    <div className="text-text-muted">
                                        {(Math.abs(diff) < 0.01 ? currentGpa.toFixed(3) : currentGpa.toFixed(2)) && `${(currentGpa * 10).toFixed(1)}%`}
                                    </div>
                                    <div className="w-4"></div>
                                    <div className="text-primary">
                                        {(Math.abs(diff) < 0.01 ? simulatedGpa.toFixed(3) : simulatedGpa.toFixed(2)) && `${(simulatedGpa * 10).toFixed(1)}%`}
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-bg-primary rounded-full relative overflow-hidden">
                                     {/* Baseline ghost bar */}
                                     <div 
                                        className="absolute inset-y-0 left-0 bg-text-muted/10 transition-all duration-500" 
                                        style={{ width: `${(currentGpa / 10) * 100}%` }}
                                    />
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(simulatedGpa / 10) * 100}%` }}
                                        className={`h-full ${diff >= 0 ? 'bg-primary' : 'bg-accent-2'}`}
                                    />
                                    {/* Tick for exact current position */}
                                    <div 
                                        className="absolute inset-y-0 w-0.5 bg-text-muted/30 z-10"
                                        style={{ left: `${(currentGpa / 10) * 100}%` }}
                                    />
                                </div>
                            </div>
                            {diff > 0.3 && (
                                <div className="p-4 rounded-2xl bg-accent-1/10 border border-accent-1/20 flex gap-3">
                                    <FiZap className="text-accent-1 flex-shrink-0 mt-1" />
                                    <p className="text-xs font-bold text-accent-1 leading-relaxed">
                                        Significant boost! This simulation would improve your ranking percentile.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-5 bg-text-primary text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        <FiCheck /> Confirm Strategy
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

