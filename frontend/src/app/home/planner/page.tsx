'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useUser } from '@/context/UserContext';
import { FiArrowLeft, FiTarget, FiTrendingUp, FiAlertCircle, FiCheckCircle, FiAward, FiZap } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import LoadingSaffron from '@/components/LoadingSaffron';

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

interface SemReport {
    semester: number;
    gpa: number;
    cgpa: number;
    total_credits: number;
    branch?: string;
    regulation?: string;
}

export default function SemesterPlanner() {
    const router = useRouter();
    const { user, homeData } = useUser();

    // Core State
    const [targetCgpa, setTargetCgpa] = useState<number>(8.0);
    const [reports, setReports] = useState<SemReport[]>([]);
    const [loading, setLoading] = useState(true);

    // Planning State
    const [subjectGoals, setSubjectGoals] = useState<Record<string, { grade: string; readiness: number }>>({});
    const [upcomingSubjects, setUpcomingSubjects] = useState<any[]>([]);
    const [isFetchingSubjects, setIsFetchingSubjects] = useState(false);

    // Initial Load & Persistent Settings
    useEffect(() => {
        const loadData = async () => {
            const storedTarget = localStorage.getItem('saffron_target_cgpa');
            if (storedTarget) setTargetCgpa(parseFloat(storedTarget));

            if (homeData?.reports?.length > 0) {
                setReports(homeData.reports);
                setLoading(false);
                return;
            }

            if (user?.id) {
                try {
                    const res = await fetch(`http://localhost:8000/reports/user/${encodeURIComponent(user.id)}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data?.reports?.length > 0) {
                            setReports(data.reports);
                            setLoading(false);
                            return;
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch reports for planner:', err);
                }
            }

            try {
                const stored = localStorage.getItem('saffron_cgpa_reports');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setReports(parsed);
                        setLoading(false);
                        return;
                    }
                }
            } catch (e) { /* ignore parse errors */ }

            setLoading(false);
        };
        loadData();
    }, [user, homeData]);

    // Derive stats
    const completedSems = useMemo(() => {
        const unique = new Set(reports.map(r => r.semester));
        return Array.from(unique).sort((a, b) => a - b);
    }, [reports]);

    const latestReport = useMemo(() => {
        if (reports.length === 0) return null;
        return [...reports].sort((a, b) => b.semester - a.semester)[0];
    }, [reports]);

    // Robust CGPA fallback (V2 Logic)
    const currentCgpa = useMemo(() => {
        if (latestReport?.cgpa && latestReport.cgpa > 0) return latestReport.cgpa;
        if (reports.length === 0) return 0;
        const uniqueSems = Array.from(new Set(reports.map(r => r.semester)));
        const totalGpa = uniqueSems.reduce((acc, sNum) => {
            const semReports = reports.filter(r => r.semester === sNum);
            const bestGpa = Math.max(...semReports.map(r => r.gpa || 0));
            return acc + bestGpa;
        }, 0);
        return totalGpa / uniqueSems.length;
    }, [latestReport, reports]);

    // Force 8-semester focus for Graduation
    const totalSems = 8;

    const nextSemester = useMemo(() => {
        if (completedSems.length === 0) return 1;
        const max = Math.max(...completedSems);
        return max < 8 ? max + 1 : null;
    }, [completedSems]);

    const remainingSems = useMemo(() => {
        return Math.max(0, 8 - completedSems.length);
    }, [completedSems]);

    const gpaBySem = useMemo(() => {
        const map: Record<number, number> = {};
        reports.forEach(r => {
            if (!map[r.semester] || r.gpa > map[r.semester]) map[r.semester] = r.gpa;
        });
        return map;
    }, [reports]);

    // Fetch subjects
    useEffect(() => {
        if (nextSemester && latestReport?.branch && latestReport?.regulation) {
            const fetchSubjects = async () => {
                setIsFetchingSubjects(true);
                try {
                    const res = await fetch(`http://localhost:8000/curriculum/subjects?branch=${encodeURIComponent(latestReport.branch || '')}&regulation=${encodeURIComponent(latestReport.regulation || '')}&semester=${nextSemester}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'success' && data.subjects?.length > 0) {
                            setUpcomingSubjects(data.subjects);
                            const initialGoals: Record<string, { grade: string; readiness: number }> = {};

                            // 3. Smart Default Grades based on GRADUATION TARGET (Consistency requested)
                            const targetVal = Math.min(10, Math.max(0, targetCgpa));
                            const gpMapEntries = [
                                { grade: 'O', pts: 10 }, { grade: 'A+', pts: 9 }, { grade: 'A', pts: 8 },
                                { grade: 'B+', pts: 7 }, { grade: 'B', pts: 6 }, { grade: 'C', pts: 5 }
                            ];
                            // Find the minimum grade required to meet or exceed the graduation target
                            // e.g., if target is 8.6, we should suggest 'A+' (9) not 'A' (8)
                            const bestGrade = [...gpMapEntries].reverse().find(g => g.pts >= targetVal)?.grade || 'O';

                            data.subjects.forEach((s: any) => {
                                initialGoals[s.subject_code] = { grade: bestGrade, readiness: 40 };
                            });
                            setSubjectGoals(initialGoals);
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch subjects:', err);
                }
                setIsFetchingSubjects(false);
            };
            fetchSubjects();
        }
    }, [nextSemester, latestReport, targetCgpa]); // Added targetCgpa for live sync

    // Math Logic for Planning
    const predictedNextGpa = useMemo(() => {
        if (upcomingSubjects.length === 0) return 0;
        const gpMap: Record<string, number> = { 'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'U': 0, 'RA': 0, 'S': 10 };
        let totalWeighted = 0;
        let totalCredits = 0;
        upcomingSubjects.forEach(s => {
            const goal = subjectGoals[s.subject_code];
            const gradePoints = gpMap[goal?.grade] ?? 10;
            const credits = s.credits || 3;
            totalWeighted += gradePoints * credits;
            totalCredits += credits;
        });
        return totalCredits > 0 ? totalWeighted / totalCredits : 0;
    }, [upcomingSubjects, subjectGoals]);

    const globalRequiredGpa = useMemo(() => {
        if (remainingSems <= 0) return 0;
        const totalPointsNeeded = targetCgpa * totalSems;
        const pointsEarned = currentCgpa * completedSems.length;
        const needed = (totalPointsNeeded - pointsEarned) / remainingSems;
        return Math.max(0, Math.min(10, needed));
    }, [targetCgpa, currentCgpa, completedSems.length, remainingSems, totalSems]);

    const requiredInFuture = useMemo(() => {
        const remainingAfterThis = remainingSems - 1;
        if (remainingAfterThis <= 0) return globalRequiredGpa;
        const totalPointsNeeded = targetCgpa * totalSems;
        const pointsEarned = currentCgpa * completedSems.length;
        const pointsFromPlan = predictedNextGpa;
        const needed = (totalPointsNeeded - pointsEarned - pointsFromPlan) / remainingAfterThis;
        return Math.max(0, Math.min(10, needed));
    }, [targetCgpa, currentCgpa, completedSems.length, remainingSems, predictedNextGpa, totalSems, globalRequiredGpa]);

    const predictedFinalCgpa = useMemo(() => {
        const pointsEarned = currentCgpa * completedSems.length;
        const pointsFromThis = predictedNextGpa;
        const futureSems = Math.max(0, remainingSems - 1);
        const pointsFromFuture = globalRequiredGpa * futureSems;
        return (pointsEarned + pointsFromThis + pointsFromFuture) / totalSems;
    }, [currentCgpa, completedSems.length, predictedNextGpa, remainingSems, globalRequiredGpa, totalSems]);

    // UI Helpers
    const getGradeLabel = (gpa: number) => {
        if (gpa >= 9.5) return 'S Grade (Near Perfect)';
        if (gpa >= 9.0) return 'S/O Grade Range';
        if (gpa >= 8.5) return 'O Grade Range';
        if (gpa >= 8.0) return 'A+ Grade Range';
        if (gpa >= 7.5) return 'A Grade Range';
        if (gpa >= 7.0) return 'B+ Grade Range';
        if (gpa >= 6.0) return 'B Grade Range';
        return 'C Grade Range';
    };

    const getDifficultyColor = (gpa: number) => {
        if (gpa >= 9.5) return 'text-error';
        if (gpa >= 9.0) return 'text-primary';
        if (gpa >= 8.0) return 'text-accent-1';
        if (gpa >= 7.0) return 'text-success';
        return 'text-data';
    };

    if (loading) return <LoadingSaffron message="Loading Semester Planner..." />;

    if (reports.length === 0) {
        return (
            <main className="min-h-screen bg-bg-primary text-text-primary p-6 md:p-12 relative overflow-hidden">
                <ParticleBackground />
                <div className="max-w-4xl mx-auto relative z-10">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-8 group">
                        <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-widest">Back to Dashboard</span>
                    </button>
                    <div className="text-center py-24">
                        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-8 shadow-inner">
                            <FiTarget size={40} />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter mb-4">No Semesters Found</h1>
                        <p className="text-text-muted font-medium max-w-md mx-auto mb-8">
                            Upload your marksheet to start planning.
                        </p>
                        <button onClick={() => router.push('/home')} className="px-8 py-4 bg-primary text-white font-black rounded-2xl hover:scale-105 transition-transform">
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    const isPossible = globalRequiredGpa <= 10;
    const isEasy = globalRequiredGpa <= 7.0;
    const isHard = globalRequiredGpa > 9.0;

    return (
        <main className="min-h-screen bg-bg-primary text-text-primary p-6 md:p-12 relative overflow-hidden">
            <ParticleBackground />
            <div className="max-w-6xl mx-auto relative z-10">
                {/* Header Section */}
                <button onClick={() => router.back()} className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-10 group">
                    <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-[0.2em]">Back to Dashboard</span>
                </button>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none mb-6">
                            Semester <span className="text-primary italic">Planner</span>
                        </h1>
                        <p className="text-text-muted font-medium max-w-lg text-lg leading-relaxed">
                            Strategize your academic journey. See exactly what's needed to reach your dream graduation goal.
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="px-8 py-4 bg-bg-card border border-border rounded-[2rem] text-center shadow-xl backdrop-blur-md">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">Current</p>
                            <p className="text-3xl font-black text-primary">{currentCgpa.toFixed(2)}</p>
                        </div>
                        <div className="px-8 py-4 bg-bg-card border border-border rounded-[2rem] text-center shadow-xl backdrop-blur-md">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1">Status</p>
                            <p className="text-3xl font-black">{completedSems.length}/{totalSems}</p>
                        </div>
                    </div>
                </div>

                {/* STEP 1: Goal Setup */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-10 md:p-14 rounded-[4rem] bg-bg-card border-2 border-border/40 shadow-2xl relative overflow-hidden mb-12 group transition-all duration-500 hover:border-primary/20">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] -mr-64 -mt-64 pointer-events-none group-hover:bg-primary/10 transition-colors duration-700" />

                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-14 relative z-10">
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary shadow-xl ring-1 ring-primary/20">
                                <FiTarget size={32} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black tracking-tight mb-2">Set Your Target CGPA</h3>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest opacity-60">Graduation Goal (Standard 8 Semester Course)</p>
                            </div>
                        </div>
                        <div className="text-center md:text-right">
                            <span className="text-8xl md:text-9xl font-black text-primary tracking-tighter drop-shadow-2xl tabular-nums">{targetCgpa.toFixed(2)}</span>
                            <p className="text-[11px] font-black text-text-muted uppercase tracking-[0.4em] mt-3">Planned Graduation Score</p>
                        </div>
                    </div>

                    <div className="relative z-10">
                        <input
                            type="range" min="5.0" max="10.0" step="0.05"
                            value={targetCgpa}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setTargetCgpa(val);
                                localStorage.setItem('saffron_target_cgpa', val.toString());
                            }}
                            className="w-full h-4 bg-bg-card-alt border border-border rounded-full appearance-none cursor-pointer accent-primary shadow-inner hover:accent-primary-hover transition-all"
                        />
                        <div className="flex justify-between mt-6 text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-30">
                            <span>5.0</span><span>10.0</span>
                        </div>
                    </div>
                </motion.div>

                {/* STEP 2: Required Target (Restored below Step 1 as requested) */}
                <div
                    className={`p-6 md:p-10 lg:p-14 rounded-[3rem] md:rounded-[4rem] border-2 shadow-2xl relative overflow-hidden mb-12 md:mb-16 ${!isPossible ? 'bg-error/5 border-error/20' : isEasy ? 'bg-success/5 border-success/20' : 'bg-primary/5 border-primary/20'}`}
                >
                    <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/5 blur-[150px] -ml-80 -mt-80 pointer-events-none" />

                    {remainingSems === 0 ? (
                        <div className="text-center py-10 relative z-10 w-full">
                            <div className="w-28 h-28 rounded-[2.5rem] bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center text-success mx-auto mb-10 shadow-2xl ring-1 ring-success/20">
                                <FiAward size={56} />
                            </div>
                            <h2 className="text-5xl font-black tracking-tight mb-4">Journey Complete! 🎓</h2>
                            <p className="text-text-muted text-xl font-medium">Final Degree CGPA: <span className="text-success font-black ml-2 text-3xl">{currentCgpa.toFixed(2)}</span></p>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row items-center gap-16 relative z-10">
                            <div className="flex-1 text-center lg:text-left">
                                <p className="text-[12px] font-black text-text-muted uppercase tracking-[0.3em] mb-6">
                                    PROJECTED SEMESTER GOAL (MATCHES <span className="text-secondary">{targetCgpa.toFixed(2)}</span> TARGET)
                                </p>
                                <div className="flex flex-wrap items-baseline gap-6 md:gap-10 justify-center lg:justify-start">
                                    <div className="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-black tracking-tighter leading-none tabular-nums text-primary drop-shadow-2xl">
                                        {targetCgpa.toFixed(2)}
                                    </div>
                                    {!isPossible ? (
                                        <div className="p-6 rounded-3xl bg-error/10 border border-error/20 max-w-sm">
                                            <p className="text-error font-black text-sm uppercase tracking-widest mb-1">Unreachable Goal</p>
                                            <p className="text-text-muted text-xs font-medium">Max possible is {predictedFinalCgpa.toFixed(2)}</p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col p-4 px-6 rounded-2xl bg-bg-card-alt/50 border border-border/40 shadow-sm">
                                            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-1 opacity-60">Needed for Goal</span>
                                            <span className={`${getDifficultyColor(globalRequiredGpa)} text-3xl font-black tabular-nums`}>
                                                {globalRequiredGpa.toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className={`px-6 py-2 md:px-8 md:py-3 rounded-2xl border-2 inline-flex items-center gap-3 md:gap-4 shadow-xl backdrop-blur-md mt-8 md:mt-10 ${isEasy ? 'bg-success/10 border-success/20 text-success' : isHard ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-accent-1/10 border-accent-1/20 text-accent-1'}`}>
                                    {isEasy ? <FiCheckCircle size={18} /> : isHard ? <FiZap size={18} className="animate-bounce" /> : <FiTrendingUp size={18} />}
                                    <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.15em]">{isEasy ? 'High Probability' : isHard ? 'MAX Effort Required' : 'Consistent Effort Needed'}</span>
                                </div>
                            </div>
                            <div className="px-10 py-8 lg:px-14 lg:py-10 rounded-[2.5rem] lg:rounded-[3rem] bg-bg-card/30 border-2 border-border/40 text-center backdrop-blur-2xl shadow-2xl ring-1 ring-white/5 w-full lg:w-auto mt-6 lg:mt-0">
                                <p className="text-[10px] lg:text-[11px] font-black text-text-muted uppercase tracking-[0.4em] mb-3 lg:mb-4">Grade Target</p>
                                <p className="text-2xl lg:text-3xl font-black tracking-tight text-text-primary/80 whitespace-normal leading-tight">{getGradeLabel(globalRequiredGpa)}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* STEP 3: Roadmap & Visualization (Restored Premium Cards) */}
                {8 > 0 && isPossible && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                        <div className="flex items-center justify-between mb-10 ml-6">
                            <h3 className="text-lg font-black text-text-muted uppercase tracking-[0.4em]">YOUR SEMESTER ROADMAP</h3>
                            <div className="h-px bg-border flex-1 mx-8 opacity-20 hidden md:block" />
                        </div>

                        <div className={`grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 md:gap-5 mb-16`}>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                                const isDone = completedSems.includes(sem);
                                const isPlanned = sem === nextSemester && upcomingSubjects.length > 0;
                                // Show Target CGPA for all future/unplanned semesters by default
                                const gpa = isDone
                                    ? (gpaBySem[sem] || 0)
                                    : targetCgpa;
                                return (
                                    <motion.div
                                        key={sem}
                                        whileHover={{ y: -5 }}
                                        className={`p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-2 text-center transition-all ${isDone ? 'bg-success/5 border-success/30 scale-[0.97] grayscale-[0.3]' : isPlanned ? 'bg-primary/20 border-primary/50 shadow-2xl ring-2 ring-primary/20' : 'bg-bg-card-alt/20 border-border/30 border-dashed'}`}
                                    >
                                        <p className="text-[9px] md:text-[10px] font-black text-text-muted uppercase mb-3 md:mb-4 opacity-50">Sem {sem}</p>
                                        <p className={`text-2xl md:text-3xl font-black tabular-nums ${isDone ? 'text-success' : 'text-primary'}`}>{gpa.toFixed(2)}</p>
                                        <p className="text-[8px] md:text-[9px] font-black uppercase mt-2 md:mt-3 tracking-[0.2em] opacity-40">{isDone ? 'DONE' : 'TARGET'}</p>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* CGPA Journey Visualization */}
                        <div className="p-4 sm:p-8 md:p-16 rounded-[2.5rem] md:rounded-[4rem] bg-bg-card border-2 border-border/40 shadow-2xl mb-16 relative overflow-hidden group">
                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 mb-12 md:mb-16">
                                <h4 className="text-xl md:text-2xl font-black tracking-tight leading-tight">CGPA Journey Visualization</h4>
                                <div className="flex flex-wrap items-center gap-4 md:gap-6 text-[10px] md:text-[11px] font-black uppercase tracking-widest opacity-60 bg-bg-card-alt/30 p-4 rounded-3xl border border-border/20 md:border-none md:bg-transparent">
                                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded bg-success/60" /> Done</span>
                                    <span className="flex items-center gap-2 text-primary font-black"><span className="w-5 h-[2px] bg-primary/40 border-t border-dashed border-primary" /> Target: {targetCgpa.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="flex items-end gap-1 md:gap-4 h-56 md:h-64 relative z-10">
                                {/* Target Reference Line */}
                                <div
                                    className="absolute left-0 right-0 border-t-2 border-primary/20 border-dashed z-0 group-hover:border-primary/40 transition-colors pointer-events-none"
                                    style={{ bottom: `${(targetCgpa / 10) * 100}%` }}
                                />

                                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => {
                                    const isDone = completedSems.includes(sem);
                                    const isPlanned = sem === nextSemester && upcomingSubjects.length > 0;

                                    // Strictly matches the "Set Your Target CGPA" for all projections
                                    const gpa = isDone ? (gpaBySem[sem] || 0) : targetCgpa;
                                    const height = `${Math.max(15, (gpa / 10) * 100)}%`;

                                    return (
                                        <div key={sem} className="flex-1 flex flex-col items-center gap-2 md:gap-4 h-full justify-end group/bar">
                                            {/* GPA Label - Strictly target-aligned */}
                                            <span className="text-[8px] md:text-[11px] font-black text-primary bg-bg-card-alt/80 backdrop-blur px-1.5 md:px-3 py-1 rounded-full shadow-lg border border-primary/10 transition-transform group-hover/bar:scale-110 duration-300">
                                                {gpa.toFixed(2)}
                                            </span>
                                            <div className="w-full flex-1 flex items-end">
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height }}
                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                    className={`w-full rounded-t-[1.5rem] transition-all duration-500 hover:brightness-110 shadow-xl ${isDone ? 'bg-gradient-to-t from-success/40 to-success/60' : isPlanned ? 'bg-gradient-to-t from-primary/60 to-primary/80 shadow-primary/40' : 'bg-primary/5 border-t-2 border-dashed border-primary/40'}`}
                                                />
                                            </div>
                                            <span className="text-[9px] md:text-[10px] font-black text-text-muted uppercase tracking-tighter md:tracking-[0.2em] opacity-40">S{sem}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* STEP 4: Semester Planning (Now Secondary Focus at bottom) */}
                {nextSemester && upcomingSubjects.length > 0 && (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mb-12">
                        <div className="flex items-center gap-3 mb-10 ml-4">
                            <div className="w-10 h-10 rounded-2xl bg-bg-card-alt flex items-center justify-center text-primary border border-border"><Icon icon="solar:folder-path-connect-bold" /></div>
                            <h3 className="text-2xl font-black tracking-tight">Level-Up Your Prep for Sem {nextSemester}</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {upcomingSubjects.map((s) => (
                                <div key={s.subject_code} className="p-10 rounded-[3rem] bg-bg-card border-2 border-border/40 shadow-xl hover:border-primary/60 transition-all duration-500 group relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-10 relative z-10">
                                        <div className="max-w-[75%]">
                                            <div className="flex items-center gap-3 mb-3">
                                                <span className="px-3 py-1 bg-bg-card-alt border border-border rounded-xl text-[10px] font-black text-text-muted uppercase tracking-widest">{s.subject_code}</span>
                                                <span className="text-[10px] font-bold text-text-muted/40 uppercase tracking-widest">{s.credits} Credits</span>
                                            </div>
                                            <h4 className="text-xl font-black text-text-primary leading-[1.3] group-hover:text-primary transition-colors">{s.title}</h4>
                                        </div>
                                        <div className="relative">
                                            <select
                                                value={subjectGoals[s.subject_code]?.grade || 'O'}
                                                onChange={(e) => setSubjectGoals(prev => ({
                                                    ...prev,
                                                    [s.subject_code]: { ...prev[s.subject_code], grade: e.target.value }
                                                }))}
                                                className="bg-bg-card-alt border-2 border-border/50 rounded-2xl px-5 py-3 text-base font-black text-primary outline-none appearance-none cursor-pointer hover:bg-bg-card shadow-xl transition-all ring-offset-2 focus:ring-2 ring-primary/20"
                                            >
                                                {['O', 'A+', 'A', 'B+', 'B', 'C', 'U'].map(g => <option key={g} value={g}>{g}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-6 relative z-10">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em]">Current Confidence</span>
                                            <span className="text-primary text-xl font-black">{(subjectGoals[s.subject_code]?.readiness || 0)}%</span>
                                        </div>
                                        <div className="relative h-4 bg-bg-card-alt rounded-full overflow-hidden border border-border shadow-inner">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${subjectGoals[s.subject_code]?.readiness || 0}%` }} className="absolute inset-0 bg-gradient-to-r from-primary/40 to-primary" />
                                            <input
                                                type="range" min="0" max="100" step="10"
                                                value={subjectGoals[s.subject_code]?.readiness || 0}
                                                onChange={(e) => setSubjectGoals(prev => ({
                                                    ...prev,
                                                    [s.subject_code]: { ...prev[s.subject_code], readiness: parseInt(e.target.value) }
                                                }))}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                        </div>
                                        <div className="flex justify-between text-[8px] font-black text-text-muted/30 uppercase tracking-[0.3em]">
                                            <span>Clueless</span>
                                            <span>Mastered</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>
        </main>
    );
}
