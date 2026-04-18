'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { FiX, FiLock, FiStar, FiTrendingUp, FiCalendar, FiTarget } from 'react-icons/fi';
import { useUser } from '@/context/UserContext';

interface AchievementDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AchievementDetailModal({ isOpen, onClose }: AchievementDetailModalProps) {
    const { user } = useUser();
    const isPro = user?.is_pro || false;

    // Mock data for visual appeal (would be backend-driven in a real prod env)
    const streakHistory = Array.from({ length: 30 }, (_, i) => Math.random() > 0.3);
    const percentile = 98.4;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-bg-primary/80 backdrop-blur-xl"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-4xl bg-bg-card border border-border rounded-[2.5rem] shadow-2xl overflow-y-auto lg:overflow-hidden flex flex-col lg:flex-row max-h-[90vh] lg:max-h-[85vh] custom-scrollbar"
                    >
                        {/* Left Side: Stats & Hero */}
                        <div className="flex-none lg:flex-1 p-6 sm:p-8 lg:p-12 lg:overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl">
                                        <Icon icon="solar:medal-ribbons-star-bold-duotone" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl sm:text-3xl font-black tracking-tighter leading-tight">Achievement <span className="text-primary">Analytics</span></h2>
                                        <p className="text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-widest">Advanced Player Stats</p>
                                    </div>
                                </div>
                                <button onClick={onClose} className="lg:hidden p-2 text-text-muted hover:bg-bg-card-alt rounded-xl transition-colors">
                                    <FiX size={24} />
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                                <div className="p-6 rounded-3xl bg-bg-card-alt border border-border">
                                    <div className="flex items-center gap-2 text-text-muted text-[10px] font-black uppercase tracking-widest mb-2">
                                        <FiTrendingUp /> Global Percentile
                                    </div>
                                    <div className="text-4xl font-black text-text-primary mb-1">{percentile}%</div>
                                    <div className="text-xs font-bold text-primary">Top 2% of Students in India</div>
                                </div>
                                <div className="p-6 rounded-3xl bg-bg-card-alt border border-border">
                                    <div className="flex items-center gap-2 text-text-muted text-[10px] font-black uppercase tracking-widest mb-2">
                                        <FiCalendar /> Current Streak
                                    </div>
                                    <div className="text-4xl font-black text-text-primary mb-1">{user?.streak_count || 0} Days</div>
                                    <div className="text-xs font-bold text-success">Personal Best: 14 Days</div>
                                </div>
                            </div>

                            {/* Detailed Streak History */}
                            <div className="mb-10">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-black text-[10px] sm:text-sm uppercase tracking-widest text-text-muted">Activity Matrix (30D)</h4>
                                    {!isPro && <span className="text-[10px] font-bold text-primary px-2 py-1 bg-primary/10 rounded-lg whitespace-nowrap">PRO FEATURE</span>}
                                </div>

                                <div className="relative p-5 sm:p-6 rounded-3xl bg-bg-primary border border-border overflow-hidden">
                                    {!isPro && (
                                        <div className="absolute inset-0 z-10 backdrop-blur-[4px] bg-bg-card/40 flex flex-col items-center justify-center gap-3 rounded-3xl">
                                            <div className="p-3 bg-bg-card rounded-2xl border border-border shadow-xl flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-center px-6">
                                                <FiLock className="text-primary shrink-0" /> <span className="leading-tight">Unlock full history with Pro</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="overflow-x-auto pb-2 custom-scrollbar">
                                        <div className="grid grid-cols-10 gap-2 min-w-[280px]">
                                            {streakHistory.map((active, i) => (
                                                <div
                                                    key={i}
                                                    className={`aspect-square rounded-[6px] transition-all duration-300 ${active ? 'bg-primary/40 shadow-[0_0_10px_rgba(212,80,10,0.2)]' : 'bg-border/20'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-between text-[8px] font-black text-text-muted/40 uppercase tracking-widest">
                                        <span>30 Days Ago</span>
                                        <span>Today</span>
                                    </div>
                                </div>
                            </div>

                            {/* Legendary Milestones */}
                            <div className="space-y-4">
                                <h4 className="font-black text-sm uppercase tracking-widest text-text-muted mb-4">Legendary Milestones</h4>
                                {[
                                    { icon: 'solar:crown-minimalistic-bold-duotone', name: 'Dean\'s List', desc: 'Maintain 9.0+ CGPA for 4 semesters', locked: true },
                                    { icon: 'solar:fire-square-bold-duotone', name: 'Godlike Streak', desc: 'Reach a 30-day activity streak', locked: true },
                                    { icon: 'solar:pills-minimalistic-bold-duotone', name: 'Bug Hunter', desc: 'Submit 2 verified feedback reports', locked: false }
                                ].map((milestone, i) => (
                                    <div key={i} className={`p-4 rounded-2xl border flex items-center gap-4 ${milestone.locked ? 'bg-bg-card-alt/30 border-border/50 opacity-60' : 'bg-success/5 border-success/20'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${milestone.locked ? 'bg-text-muted/10 text-text-muted' : 'bg-success/10 text-success'}`}>
                                            <Icon icon={milestone.icon} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-black text-xs text-text-primary">{milestone.name}</div>
                                            <div className="text-[10px] font-bold text-text-muted">{milestone.desc}</div>
                                        </div>
                                        {milestone.locked ? <FiLock className="text-text-muted/30" /> : <Icon icon="solar:check-circle-bold" className="text-success" />}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Side: Pro Teaser */}
                        <div className="w-full lg:w-[320px] bg-bg-primary p-8 sm:p-10 flex-none lg:flex lg:flex-col lg:justify-between border-t lg:border-t-0 lg:border-l border-border relative">
                            <button onClick={onClose} className="hidden lg:block absolute top-8 right-8 p-3 hover:bg-bg-card rounded-2xl text-text-muted transition-all">
                                <FiX size={24} />
                            </button>

                            <div className="pt-4 lg:pt-8 mb-8">
                                <Icon icon="solar:crown-bold-duotone" className="w-12 h-12 lg:w-16 lg:h-16 text-primary mb-6 animate-bounce" />
                                <h3 className="text-2xl font-black tracking-tighter mb-4 text-text-primary leading-tight">Become a <span className="text-primary">Pro Player</span></h3>
                                <p className="text-xs sm:text-sm font-medium text-text-muted leading-relaxed mb-6">
                                    Unlock detailed grade analytics, placement alerts, and exclusive legendary skins for your profile.
                                </p>

                                {!isPro && (
                                    <ul className="space-y-3">
                                        {[
                                            'Full activity history',
                                            'Detailed milestone tracking',
                                            'Competitive ranking data',
                                            'Flash sale badge skins'
                                        ].map((feature, i) => (
                                            <li key={i} className="flex items-center gap-2 text-[11px] font-black text-text-primary uppercase tracking-tight">
                                                <FiStar className="text-primary" /> {feature}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {!isPro ? (
                                <button className="w-full py-5 bg-gradient-to-r from-primary to-accent-1 text-white rounded-[24px] font-black text-sm uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                    Unlock Pro Access
                                </button>
                            ) : (
                                <div className="p-6 rounded-[24px] bg-primary/10 border border-primary/20 text-center flex flex-col items-center gap-2">
                                    <Icon icon="solar:check-circle-bold" className="text-primary text-2xl" />
                                    <div className="font-black text-[10px] text-primary uppercase tracking-[0.2em]">PRO ACCESS ACTIVE</div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
