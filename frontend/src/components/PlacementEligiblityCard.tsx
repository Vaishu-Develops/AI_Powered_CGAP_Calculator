'use client';

import { motion } from 'framer-motion';
import {
    FiCheckCircle,
    FiLock,
    FiBriefcase,
    FiCheck,
    FiUnlock,
    FiStar,
    FiInfo
} from 'react-icons/fi';

interface PlacementTier {
    name: string;
    threshold: number;
    description: string;
    companies: string[];
    color: string;
    bg: string;
}

const TIERS: PlacementTier[] = [
    {
        name: 'Super Dream',
        threshold: 8.5,
        description: 'Elite Product Companies & Big Tech',
        companies: ['Google', 'Microsoft', 'Amazon', 'Adobe'],
        color: '#7C3AED',
        bg: 'bg-primary/10'
    },
    {
        name: 'Dream',
        threshold: 7.5,
        description: 'Premium Product & Service Firms',
        companies: ['TCS Digital', 'Accenture', 'Cognizant', 'Zoho'],
        color: '#F59E0B',
        bg: 'bg-accent-1/10'
    },
    {
        name: 'Core/Product',
        threshold: 6.0,
        description: 'Industry Leaders & Tech Startups',
        companies: ['Infosys', 'Wipro', 'HCL', 'Capgemini'],
        color: '#10B981',
        bg: 'bg-success/10'
    }
];

export default function PlacementEligiblityCard({ cgpa, isPro = false }: { cgpa: number; isPro?: boolean }) {
    const qualifiedTiers = TIERS.filter(t => cgpa >= t.threshold);
    const lockedTiers = TIERS.filter(t => cgpa < t.threshold).sort((a, b) => a.threshold - b.threshold);
    const nextTier = lockedTiers[0];
    const gap = nextTier ? (nextTier.threshold - cgpa).toFixed(2) : null;
    const qualPercentage = Math.round((qualifiedTiers.length / TIERS.length) * 100);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.2, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 20 } as const }
    };

    return (
        <div className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl shadow-inner">
                        <FiBriefcase />
                    </div>
                    <div>
                        <h4 className="text-2xl font-black text-text-primary tracking-tight">Placement Eligibility</h4>
                        <p className="text-text-muted font-bold text-sm">Real-time career qualification based on your 2025 score</p>
                    </div>
                </div>

                <div className="flex flex-col items-end">
                    <div className="text-3xl font-black text-primary tracking-tighter tabular-nums">{qualPercentage}%</div>
                    <div className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Qualification Probability</div>
                </div>
            </div>

            {gap && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <FiStar className="animate-spin-slow" />
                        </div>
                        <p className="text-sm font-bold text-text-primary">
                            Just <span className="text-primary text-lg">{gap}</span> more for <span className="text-primary uppercase tracking-wider">{nextTier?.name}</span> Tier!
                        </p>
                    </div>
                    {!isPro && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-accent-1/10 rounded-full text-[10px] font-black text-accent-1 uppercase border border-accent-1/20">
                            Pro Bonus +10% Edge
                        </div>
                    )}
                </motion.div>
            )}

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                {TIERS.map((tier, idx) => {
                    const isQualified = cgpa >= tier.threshold;
                    return (
                        <motion.div
                            key={tier.name}
                            variants={itemVariants}
                            className={`p-8 rounded-[32px] border-2 transition-all duration-500 relative overflow-hidden group ${isQualified ? 'bg-bg-card border-primary/20 shadow-xl shadow-primary/5' : 'bg-bg-card-alt/30 border-border grayscale scale-[0.98]'
                                }`}
                        >
                            {!isQualified && (
                                <div className="absolute inset-0 bg-bg-card/40 backdrop-blur-[2px] z-10 flex items-center justify-center">
                                    <div className="bg-bg-card/80 p-3 rounded-2xl border border-border flex items-center gap-2 font-black text-[10px] text-text-muted uppercase tracking-widest shadow-xl">
                                        <FiLock /> Locked at {tier.threshold}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-6 relative z-0">
                                <div className="flex justify-between items-start">
                                    <h5 className="text-xl font-black text-text-primary tracking-tight">{tier.name}</h5>
                                    {isQualified ? <FiCheckCircle className="text-success text-2xl" /> : <FiLock className="text-text-muted text-xl" />}
                                </div>

                                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{tier.description}</p>

                                <div className="space-y-3">
                                    {tier.companies.map((company, cIdx) => (
                                        <motion.div
                                            key={company}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.5 + (idx * 0.2) + (cIdx * 0.1) }}
                                            className="flex items-center gap-3 text-sm font-black text-text-primary"
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full ${isQualified ? 'bg-primary' : 'bg-border'}`} />
                                            {company}
                                        </motion.div>
                                    ))}
                                    {isQualified && !isPro && idx === 0 && (
                                        <div className="pt-2 flex items-center gap-2 text-[10px] font-bold text-accent-1">
                                            <FiLock className="shrink-0" />
                                            <span>+12 more companies lock for Free users</span>
                                        </div>
                                    )}
                                </div>

                                <div className={`pt-6 border-t font-black text-[10px] uppercase tracking-widest flex items-center gap-2 ${isQualified ? 'text-primary border-primary/10' : 'text-text-muted border-border'}`}>
                                    {isQualified ? <><FiUnlock /> Unlocked via Score</> : <>Threshold: {tier.threshold}</>}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Overall Qualification Bar */}
            <div className="pt-6 relative">
                <div className="flex justify-between items-center mb-4 px-2">
                    <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Overall Eligibility Journey</span>
                    <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{qualifiedTiers.length} / {TIERS.length} Tiers Cleared</span>
                </div>
                <div className="h-6 w-full bg-bg-card-alt rounded-2xl p-1 border border-border shadow-inner">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${qualPercentage}%` }}
                        transition={{ duration: 2, delay: 0.5, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-primary via-primary to-accent-1 rounded-xl shadow-lg shadow-primary/20 relative group"
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.3)_50%,transparent_75%)] bg-[length:250%_250%] animate-shimmer" />
                        <div className="absolute -right-3 -top-1 w-8 h-8 bg-bg-card rounded-full border-4 border-primary flex items-center justify-center shadow-lg group-hover:scale-125 transition-transform">
                            <FiStar className="text-primary text-[10px]" />
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 p-4 rounded-2xl bg-bg-card-alt border border-border flex items-center gap-3">
                    <FiInfo className="text-primary flex-shrink-0" />
                    <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                        Eligibility criteria may vary by company. This is an average based on 2025 placement data.
                    </p>
                </div>
                {!isPro && (
                    <button
                        className="p-4 rounded-2xl bg-accent-1/10 border border-accent-1/30 text-accent-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-accent-1/20 transition-all shadow-sm"
                    >
                        <FiStar fill="currentColor" /> Unlock Saffron Pro CTC Insights
                    </button>
                )}
            </div>
        </div>
    );
}
