'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import dynamic from 'next/dynamic';
import { FiPlus, FiCheck, FiDownload, FiTrendingUp, FiActivity, FiAlertCircle, FiAward, FiStar, FiFileText, FiBriefcase, FiCheckCircle } from 'react-icons/fi';

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

type DashboardState = 'zero' | 'single' | 'partial' | 'complete';

export default function HomePage() {
    const router = useRouter();
    const { user, isDemo, logout } = useUser();

    // For demo purposes, we default to zero if undefined.
    // In a real app, this derives from `user.semestersCalculated`
    const activeSems = user?.semestersCalculated || [];
    const activeSemsCount = activeSems.length;
    let activeState: DashboardState = 'zero';
    if (activeSemsCount === 0) activeState = 'zero';
    else if (activeSemsCount === 1) activeState = 'single';
    else if (activeSemsCount > 1 && activeSemsCount < 8) activeState = 'partial';
    else if (activeSemsCount === 8) activeState = 'complete';

    useEffect(() => {
        if (!user && !isDemo && typeof window !== 'undefined') {
            router.push('/auth');
        }
    }, [user, isDemo, router]);

    if (!user && !isDemo) {
        return null;
    }

    const handleStartCalc = () => {
        router.push('/calculate/who');
    };

    const displayName = user?.name || 'Guest Explorer';

    return (
        <main className="min-h-screen bg-bg-primary text-text-primary relative overflow-hidden font-outfit">
            <ParticleBackground />

            {/* Subtle background glow */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden mix-blend-screen opacity-50">
                <div className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] bg-[radial-gradient(circle,rgba(212,80,10,0.06)_0%,transparent_70%)] rounded-full blur-[80px] animate-pulse" />
            </div>

            <div className="relative z-10 max-w-[1200px] mx-auto px-6 pt-6 pb-32">

                {/* Navbar */}
                <nav className="flex justify-between items-center py-6 mb-8 border-b border-border/50">
                    <div className="text-xl font-black tracking-tighter cursor-pointer" onClick={() => router.push('/')}>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-1">CGPA</span> Intel
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shadow-sm">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold hidden sm:block">{displayName}</span>
                        </div>
                        {user ? (
                            <button onClick={() => { logout(); router.push('/'); }} className="text-sm font-bold text-text-muted hover:text-text-primary transition-colors bg-primary/5 border border-primary/10 px-4 py-2 rounded-full">
                                Sign Out
                            </button>
                        ) : (
                            <button onClick={() => router.push('/auth')} className="text-sm font-bold text-primary border border-primary/30 px-4 py-2 rounded-full hover:bg-primary/10 transition-colors shadow-sm">
                                Save Progress
                            </button>
                        )}
                    </div>
                </nav>

                <AnimatePresence mode="wait">

                    {/* STATE 1: Zero Data */}
                    {activeState === 'zero' && (
                        <motion.div key="zero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full">
                            <div className="bg-gradient-to-br from-bg-card to-bg-card-alt p-12 md:p-20 rounded-[40px] border border-border shadow-2xl flex flex-col justify-center items-center text-center relative overflow-hidden group">
                                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />

                                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8 border border-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                                    <FiActivity className="w-10 h-10 text-primary" />
                                </div>
                                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 text-text-primary drop-shadow-sm">
                                    Start your CGPA story.
                                </h1>
                                <p className="text-xl text-text-muted font-medium mb-10 max-w-xl mx-auto">
                                    You have no marksheets uploaded yet. Let's calculate your first semester GPA in seconds.
                                </p>
                                <button
                                    onClick={handleStartCalc}
                                    className="px-10 py-5 bg-gradient-to-r from-primary to-[#E65C00] text-white font-black text-xl rounded-full shadow-[0_20px_40px_rgba(212,80,10,0.3)] hover:scale-105 hover:shadow-[0_25px_50px_rgba(212,80,10,0.4)] transition-all flex items-center gap-3 relative overflow-hidden border border-primary/20"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                                    <FiPlus className="w-6 h-6" />
                                    <span>Calculate First Semester</span>
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STATE 2: Single Sem Only */}
                    {activeState === 'single' && (
                        <motion.div key="single" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full space-y-8">

                            {/* SECTION A — YOUR NUMBER */}
                            <div className="bg-bg-card border border-border p-10 md:p-14 rounded-[40px] shadow-lg relative overflow-hidden flex flex-col items-center text-center gap-4">
                                <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-2">SECTION A — YOUR NUMBER</h3>
                                <h1 className="text-6xl md:text-[6rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-1 leading-none">
                                    8.45
                                </h1>
                                <p className="text-xl font-bold uppercase tracking-widest">Semester {activeSems[0]} GPA</p>
                                <div className="inline-flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-full text-sm font-bold shadow-sm">
                                    <FiAward className="w-4 h-4" /> First Class
                                </div>

                                <div className="mt-8 flex flex-col md:flex-row items-center gap-3 bg-accent-1/10 text-primary border border-accent-1/20 px-6 py-4 rounded-2xl max-w-2xl text-sm font-medium">
                                    <FiAlertCircle className="w-6 h-6 shrink-0" />
                                    <p className="text-left">
                                        <strong>This is your Sem {activeSems[0]} GPA only — not your full CGPA yet.</strong><br />
                                        Add other semesters to calculate your overall CGPA.
                                    </p>
                                </div>
                                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                            </div>

                            {/* SECTION B — YOUR JOURNEY */}
                            <JourneyRow activeSems={activeSems} />

                            {/* SECTION C — USEFUL NOW */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-bg-card border border-border p-8 rounded-[32px] relative overflow-hidden shadow-sm flex flex-col">
                                    <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-6">SECTION C — USEFUL NOW</h3>
                                    <h3 className="text-2xl font-black flex items-center gap-3 mb-2">
                                        <FiFileText className="text-primary" /> Sem {activeSems[0]} Breakdown
                                    </h3>
                                    <p className="text-text-primary font-medium mb-6">14 subjects · 0 arrears · 21.5 credits</p>
                                    <div className="flex gap-4 mt-auto">
                                        <div className="bg-bg-primary border border-border p-4 rounded-xl flex-1">
                                            <p className="text-xs text-text-muted uppercase tracking-widest font-bold mb-1">Best</p>
                                            <p className="font-bold">CS8601 (O)</p>
                                        </div>
                                        <div className="bg-bg-primary border border-border p-4 rounded-xl flex-1">
                                            <p className="text-xs text-text-muted uppercase tracking-widest font-bold mb-1">Lowest</p>
                                            <p className="font-bold">CS8604 (B+)</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-bg-card-alt border border-border p-8 rounded-[32px] relative overflow-hidden flex flex-col justify-between shadow-sm">
                                    <div>
                                        <h3 className="text-2xl font-black flex items-center gap-3 mb-6">
                                            <FiTrendingUp className="text-primary" /> What-If for Sem {activeSems[0] + 1}
                                        </h3>
                                        <p className="text-text-primary text-lg font-medium leading-relaxed italic border-l-4 border-primary/30 pl-4 py-1 mb-8">
                                            "Score O in all Sem {activeSems[0] + 1} subjects → <br />Sem {activeSems[0] + 1} GPA could reach 9.2"
                                        </p>
                                    </div>
                                    <button className="w-full py-4 bg-primary text-white font-bold rounded-xl mt-auto shadow-sm hover:translate-y-[-2px] transition-all">
                                        Try Simulator →
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STATE 3: Partial Sems */}
                    {activeState === 'partial' && (
                        <motion.div key="partial" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full space-y-8">

                            {/* SECTION A — YOUR NUMBER */}
                            <div className="bg-bg-card border border-border p-10 md:p-14 rounded-[40px] shadow-lg relative overflow-hidden flex flex-col items-center text-center gap-4">
                                <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-2">SECTION A — YOUR NUMBER</h3>
                                <h1 className="text-6xl md:text-[6rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-1 leading-none">
                                    8.79
                                </h1>
                                <p className="text-xl font-bold uppercase tracking-widest">CGPA so far · Sem 1 to {Math.max(0, ...activeSems)}</p>
                                <div className="inline-flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-full text-sm font-bold shadow-sm mb-6">
                                    <FiAward className="w-4 h-4" /> First Class with Distinction
                                </div>

                                {/* ASCII stylized visual progress */}
                                <div className="w-full max-w-3xl flex items-center justify-center gap-4 py-6 border-t border-border/50">
                                    <div className="flex-1 h-3 bg-bg-primary border border-border rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-primary to-accent-1 rounded-full" style={{ width: `${Math.round((activeSems.length / 8) * 100)}%` }} />
                                    </div>
                                    <span className="font-jetbrains font-bold text-primary text-xl">{Math.round((activeSems.length / 8) * 100)}%</span>
                                </div>
                                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
                            </div>

                            {/* SECTION B — YOUR JOURNEY */}
                            <JourneyRow activeSems={activeSems} />

                            {/* SECTION C — INSIGHTS */}
                            <div className="px-2">
                                <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-4">SECTION C — INSIGHTS</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-gradient-to-br from-bg-card to-bg-card-alt border border-primary/20 p-8 rounded-[32px] relative overflow-hidden flex flex-col justify-between shadow-sm">
                                        <div>
                                            <h3 className="text-2xl font-black flex items-center gap-3 mb-6">
                                                <FiStar className="text-primary" /> AI Insight
                                            </h3>
                                            <p className="text-text-primary text-lg font-medium leading-relaxed italic border-l-4 border-primary/30 pl-4 py-1 mb-8">
                                                "Maintain Sem {Math.max(0, ...activeSems) + 1} GPA above 8.0 and your final CGPA reaches 8.52 — Distinction"
                                            </p>
                                        </div>
                                        <button className="w-full py-4 bg-primary text-white font-bold rounded-xl mt-auto shadow-sm hover:translate-y-[-2px] transition-all">
                                            Simulate →
                                        </button>
                                    </div>

                                    <div className="bg-bg-card border border-border p-8 rounded-[32px] relative overflow-hidden flex flex-col justify-between shadow-sm">
                                        <div>
                                            <h3 className="text-2xl font-black flex items-center gap-3 mb-6">
                                                <FiTrendingUp className="text-primary" /> What-If Scenario
                                            </h3>
                                            <p className="text-text-muted text-lg mb-8 font-medium">Explore grade scenarios for your {8 - activeSems.length} upcoming semesters.</p>
                                        </div>
                                        <button className="w-full flex items-center justify-center gap-2 py-4 bg-bg-primary text-text-primary font-bold rounded-xl mt-auto shadow-sm border border-border hover:bg-bg-card-alt transition-all">
                                            <FiActivity /> Try Simulator →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STATE 4: All 8 Sems Complete */}
                    {activeState === 'complete' && (
                        <motion.div key="complete" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full space-y-8">

                            {/* SECTION A — YOUR NUMBER */}
                            <div className="bg-gradient-to-br from-bg-card to-[#FFF0E5] border border-primary/30 p-10 md:p-14 rounded-[40px] shadow-2xl relative overflow-hidden flex flex-col items-center text-center gap-4">
                                <h3 className="text-sm font-bold tracking-widest text-[#D4500A] uppercase mb-2 opacity-80">SECTION A — YOUR NUMBER</h3>
                                <h1 className="text-6xl md:text-[6rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#D4500A] to-accent-1 leading-none drop-shadow-sm">
                                    9.02
                                </h1>
                                <p className="text-xl font-bold uppercase tracking-widest text-text-primary">Final Degree CGPA</p>
                                <div className="inline-flex items-center gap-2 text-primary bg-primary/10 border border-primary/20 px-4 py-2 rounded-full text-sm font-bold shadow-sm mb-4">
                                    <FiAward className="w-4 h-4" /> First Class with Distinction
                                </div>

                                <div className="w-full max-w-sm mt-6 relative z-20">
                                    <button className="w-full px-8 py-5 bg-primary text-white font-black text-lg rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-3">
                                        <FiDownload className="w-6 h-6" /> Download Degree Report
                                    </button>
                                </div>
                                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[150%] bg-[radial-gradient(circle,rgba(212,80,10,0.15)_0%,transparent_70%)] rounded-full blur-[80px] pointer-events-none z-0" />
                            </div>

                            {/* SECTION B — YOUR JOURNEY */}
                            <JourneyRow activeSems={activeSems} />

                            {/* SECTION C — INSIGHTS */}
                            <div className="px-2">
                                <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-4">SECTION C — INSIGHTS</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="bg-bg-card-alt border border-border p-8 rounded-[32px] relative overflow-hidden flex flex-col justify-between shadow-sm">
                                        <div>
                                            <h3 className="text-2xl font-black flex items-center gap-3 mb-6">
                                                <FiBriefcase className="text-primary" /> Placement Analytics
                                            </h3>
                                            <p className="text-text-primary text-lg font-medium mb-4">
                                                Based on your final CGPA of 9.02, you are eligible for <strong>100%</strong> of Tier-1 company placement drives.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-bg-card border border-border p-8 rounded-[32px] relative overflow-hidden flex flex-col justify-between shadow-sm">
                                        <div>
                                            <h3 className="text-2xl font-black flex items-center gap-3 mb-6">
                                                <FiCheckCircle className="text-primary" /> Curriculum Complete
                                            </h3>
                                            <p className="text-text-muted text-lg mb-8 font-medium">All 8 semesters successfully verified against Anna University Regulations 2021.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </main>
    );
}

// Reusable Journey Row Component representing 8 semesters
function JourneyRow({ activeSems }: { activeSems: number[] }) {
    const router = useRouter();
    const handleAdd = () => router.push('/calculate/who');

    // Mock GPAs for visual mapping
    const mockGpas: Record<number, number> = { 1: 7.2, 2: 7.8, 3: 8.1, 4: 7.9, 5: 8.3, 6: 8.45, 7: 8.8, 8: 9.1 };

    return (
        <div className="bg-bg-card border border-border p-8 rounded-[32px] overflow-x-auto shadow-sm">
            <h3 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-8">SECTION B — YOUR JOURNEY</h3>
            <div className="flex gap-4 min-w-max pb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                    const isActive = activeSems.includes(sem);
                    return (
                        <div key={sem} className="flex flex-col items-center gap-3">
                            {isActive ? (
                                <button
                                    title="Click to view inline data"
                                    className="w-16 h-16 md:w-20 md:h-20 bg-primary/10 border border-primary/30 rounded-2xl flex flex-col items-center justify-center text-primary shadow-sm hover:bg-primary/20 transition-all hover:scale-105"
                                >
                                    <FiCheckCircle className="w-4 h-4 md:w-5 md:h-5 md:mb-1" />
                                    <span className="text-xs md:text-sm font-bold">{mockGpas[sem] || 8.0}</span>
                                </button>
                            ) : (
                                <button
                                    onClick={handleAdd}
                                    title="Click to start upload"
                                    className="w-16 h-16 md:w-20 md:h-20 bg-bg-primary border border-border border-dashed rounded-2xl flex items-center justify-center text-text-muted hover:border-primary/50 hover:text-primary hover:bg-primary/10 transition-colors group relative shadow-sm"
                                >
                                    <FiPlus className="w-6 h-6 group-hover:scale-125 transition-transform" />
                                    {/* Pulse effect on the immediate next missing semester */}
                                    {sem === Math.max(0, ...activeSems) + 1 && (
                                        <span className="absolute inset-0 rounded-2xl border-2 border-primary animate-ping opacity-50" />
                                    )}
                                </button>
                            )}
                            <span className="text-xs font-bold text-text-muted tracking-widest uppercase">Sem {sem}</span>
                        </div>
                    );
                })}
            </div>
            {/* Added instructions snippet for Journey row click behaviors */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 text-xs text-text-muted font-medium pt-4 border-t border-border/50">
                <span className="flex items-center gap-2"><div className="bg-primary/10 text-primary p-1 rounded"><FiCheckCircle className="w-3 h-3" /></div> Click <FiCheckCircle className="w-3 h-3 text-primary" /> to expand inline showing that sem's data</span>
                <span className="flex items-center gap-2"><div className="bg-bg-primary border border-dashed border-border p-1 rounded"><FiPlus className="w-3 h-3" /></div> Click <FiPlus className="w-3 h-3 text-text-muted" /> to start upload for that semester</span>
            </div>
        </div>
    );
}
