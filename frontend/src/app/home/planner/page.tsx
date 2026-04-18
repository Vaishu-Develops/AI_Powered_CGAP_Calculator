'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useUser } from '@/context/UserContext';
import { FiArrowLeft, FiTarget, FiTrendingUp, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import dynamic from 'next/dynamic';

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

export default function SemesterPlanner() {
    const router = useRouter();
    const { user, homeData } = useUser();
    const [targetCgpa, setTargetCgpa] = useState<number>(8.5);

    // Derive current stats from homeData
    const reports = homeData?.reports || [];
    const completedSems = homeData?.semesters_present?.length || 0;
    const currentCgpa = reports.length > 0 ? reports[reports.length - 1].cgpa : 0;
    const remainingSems = Math.max(0, 8 - completedSems);

    const requiredGpa = useMemo(() => {
        if (remainingSems <= 0) return 0;
        // Formula: (Target * 8 - Current * Completed) / Remaining
        const totalPointsNeeded = targetCgpa * 8;
        const pointsEarned = currentCgpa * completedSems;
        const needed = (totalPointsNeeded - pointsEarned) / remainingSems;
        return needed;
    }, [targetCgpa, currentCgpa, completedSems, remainingSems]);

    const isPossible = requiredGpa <= 10;
    const isEasy = requiredGpa <= 7.0;
    const isHard = requiredGpa > 9.0;

    return (
        <main className="min-h-screen bg-bg-primary text-text-primary p-6 md:p-12 relative overflow-hidden">
            <ParticleBackground />

            {/* Header */}
            <div className="max-w-4xl mx-auto relative z-10">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-8 group"
                >
                    <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Back to Dashboard</span>
                </button>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                    <div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-none mb-4">
                            Semester <span className="text-primary">Planner</span>
                        </h1>
                        <p className="text-text-muted font-medium max-w-lg">
                            Strategize your academic journey. Set your target CGPA and we'll calculate the performance needed in your remaining semesters.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Input Card */}
                    <div className="p-8 md:p-10 rounded-[2.5rem] bg-bg-card border border-border shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16" />

                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <FiTarget size={20} />
                            </div>
                            <h3 className="text-lg font-black tracking-tight">Set Your Goal</h3>
                        </div>

                        <div className="space-y-10">
                            <div>
                                <div className="flex justify-between items-end mb-4">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Target Cumulative CGPA</label>
                                    <span className="text-3xl font-black text-primary">{targetCgpa.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min="5.0"
                                    max="10.0"
                                    step="0.05"
                                    value={targetCgpa}
                                    onChange={(e) => setTargetCgpa(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                                />
                                <div className="flex justify-between mt-2 text-[8px] font-bold text-text-muted/40 uppercase tracking-widest">
                                    <span>5.0</span>
                                    <span>10.0</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border/50">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl bg-bg-card-alt border border-border">
                                        <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Current CGPA</p>
                                        <p className="text-xl font-black text-text-primary">{currentCgpa.toFixed(2)}</p>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-bg-card-alt border border-border">
                                        <p className="text-[8px] font-black text-text-muted uppercase tracking-widest mb-1">Sems Left</p>
                                        <p className="text-xl font-black text-text-primary">{remainingSems}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result Card */}
                    <motion.div
                        initial={false}
                        animate={{
                            backgroundColor: !isPossible ? 'rgba(239, 68, 68, 0.05)' : isEasy ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0)'
                        }}
                        className="p-8 md:p-10 rounded-[2.5rem] bg-bg-card border border-border shadow-2xl flex flex-col justify-center text-center relative overflow-hidden"
                    >
                        <AnimatePresence mode="wait">
                            {!isPossible ? (
                                <motion.div
                                    key="impossible"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center text-error mb-6">
                                        <FiAlertCircle size={32} />
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tight mb-3">Mathematically Impossible</h2>
                                    <p className="text-sm font-medium text-text-muted max-w-xs mx-auto">
                                        Even a 10.0 GPA in all remaining semesters won't reach this target. Try lowering your goal?
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="possible"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="flex flex-col items-center"
                                >
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">Required Average GPA per semester</p>
                                    <div className="text-7xl md:text-8xl font-black text-text-primary tracking-tighter mb-6">
                                        {requiredGpa.toFixed(2)}
                                    </div>

                                    <div className={`px-6 py-2 rounded-full border flex items-center gap-2 mb-8 ${isEasy ? 'bg-success/10 border-success/20 text-success' :
                                            isHard ? 'bg-primary/10 border-primary/20 text-primary' :
                                                'bg-text-muted/5 border-border text-text-muted'
                                        }`}>
                                        {isEasy && <><FiCheckCircle /> <span className="text-[10px] font-black uppercase">Highly Achievable</span></>}
                                        {isHard && <><FiTrendingUp /> <span className="text-[10px] font-black uppercase">Heavy Grind Required</span></>}
                                        {!isEasy && !isHard && <><FiTrendingUp /> <span className="text-[10px] font-black uppercase">Consistent Effort Needed</span></>}
                                    </div>

                                    <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(requiredGpa / 10) * 100}%` }}
                                            className={`h-full ${isHard ? 'bg-primary' : 'bg-success'}`}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                {/* Legend/Info */}
                <div className="mt-12 p-8 rounded-[2rem] bg-bg-card-alt/30 border border-border/50">
                    <div className="flex items-center gap-2 mb-4">
                        <Icon icon="solar:info-circle-bold-duotone" className="text-primary w-5 h-5" />
                        <h4 className="text-sm font-black uppercase tracking-tight">How it's Calculated</h4>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                        The planner assumes each semester has an equal weight of credits for the sake of projection. It calculates the minimum GPA needed in every remaining term (up to a total of 8 semesters) to pull your current Cumulative GPA up to your target.
                    </p>
                </div>
            </div>
        </main>
    );
}
