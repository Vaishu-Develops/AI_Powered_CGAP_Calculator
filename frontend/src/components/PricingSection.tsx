'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

const PLANS = {
    semester: {
        name: 'Semester',
        price: '99',
        period: '6 months',
        badge: null,
        originalPrice: null,
    },
    annual: {
        name: 'Annual',
        price: '199',
        period: 'year',
        badge: 'BEST VALUE',
        originalPrice: '499',
    },
};

const FREE_FEATURES = [
    { icon: 'solar:infinity-bold', text: 'Unlimited manual calculations', vibe: 'Infinite ammo' },
    { icon: 'solar:cpu-bolt-bold-duotone', text: '2 free marksheet scans', vibe: 'Try AI for 2 semesters' },
    { icon: 'solar:file-text-bold-duotone', text: 'Basic GPA PDF export', vibe: 'Screenshot your W' },
    { icon: 'solar:user-bold-duotone', text: 'Solo profile only', vibe: 'Solo queue' },
    { icon: 'solar:calendar-bold-duotone', text: 'Last 30 days history', vibe: 'Short-term memory' },
];

const PRO_FEATURES = [
    { icon: 'solar:cpu-bolt-bold-duotone', text: 'Unlimited AI OCR scans', vibe: 'Infinite loot drops' },
    { icon: 'solar:users-group-two-rounded-bold-duotone', text: '+1 Friend\'s Profile', vibe: 'Carry your duo partner' },
    { icon: 'solar:target-bold-duotone', text: 'What-If CGPA Simulator', vibe: 'Plan your endgame' },
    { icon: 'solar:document-bold-duotone', text: 'Full CGPA Dashboard PDF', vibe: 'Flex your stats' },
    { icon: 'solar:calendar-mark-bold-duotone', text: 'Semester Planner', vibe: 'Map your loot path to 9.0+' },
    { icon: 'solar:shield-star-bold-duotone', text: 'Placement Eligibility Alerts', vibe: 'Know your rank' },
    { icon: 'solar:medal-ribbons-star-bold-duotone', text: 'Full Streaks & Badges', vibe: 'Unlock all skins' },
    { icon: 'solar:share-circle-bold-duotone', text: 'Semester Wrapped Cards', vibe: 'Share your W' },
];

export default function PricingSection() {
    const [billing, setBilling] = useState<'semester' | 'annual'>('annual');
    const plan = PLANS[billing];

    return (
        <div id="pricing" className="mb-48 max-w-6xl mx-auto px-6 relative scroll-mt-24">
            {/* Saffron atmospheric glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[200px] -z-10 pointer-events-none" />

            {/* Header */}
            <div className="text-center mb-16">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-[0.2em] mb-6"
                >
                    <Icon icon="solar:crown-bold" className="w-4 h-4" />
                    Season Pass
                </motion.div>
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-4xl md:text-6xl font-black mb-6 tracking-tighter"
                >
                    Unlock{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-1">
                        Pro Player
                    </span>{' '}
                    Mode
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-text-muted font-medium text-lg max-w-xl mx-auto"
                >
                    Winner winner, grade dinner. 🍗
                </motion.p>

                {/* Billing Toggle */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="mt-10 inline-flex items-center bg-bg-card/60 backdrop-blur-2xl border border-border/60 rounded-2xl p-1.5"
                >
                    <button
                        onClick={() => setBilling('semester')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${billing === 'semester' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        Semester
                    </button>
                    <button
                        onClick={() => setBilling('annual')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 relative ${billing === 'annual' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-text-primary'}`}
                    >
                        Annual
                        {billing !== 'annual' && (
                            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-success text-[8px] font-black text-white rounded-md">
                                -50%
                            </span>
                        )}
                    </button>
                </motion.div>
            </div>

            {/* Tier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* FREE TIER */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="group relative bg-bg-card/40 backdrop-blur-2xl border border-border/60 rounded-[2.5rem] p-10 hover:border-text-muted/30 transition-all duration-700 hover:shadow-2xl"
                >
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-xl bg-text-muted/10 flex items-center justify-center">
                                <Icon icon="solar:gamepad-bold-duotone" className="w-5 h-5 text-text-muted" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted/60">Noob Mode</span>
                        </div>
                        <h3 className="text-3xl font-black tracking-tight mb-1">Free</h3>
                        <p className="text-text-muted text-sm font-medium">Drop in. Get your GPA. GG.</p>
                    </div>

                    <div className="text-5xl font-black mb-8 tracking-tighter">
                        ₹0
                        <span className="text-sm font-bold text-text-muted ml-2">forever</span>
                    </div>

                    <ul className="space-y-4 mb-10">
                        {FREE_FEATURES.map((f, i) => (
                            <li key={i} className="flex items-start gap-3">
                                <Icon icon={f.icon} className="w-5 h-5 text-text-muted/60 mt-0.5 shrink-0" />
                                <div>
                                    <span className="text-sm font-bold text-text-primary">{f.text}</span>
                                    <span className="block text-[10px] font-bold text-text-muted/40 italic">"{f.vibe}"</span>
                                </div>
                            </li>
                        ))}
                    </ul>

                    <button className="w-full py-4 rounded-2xl border border-border/60 text-text-muted font-black text-sm uppercase tracking-widest hover:border-primary/30 hover:text-primary transition-all duration-300">
                        Current Plan
                    </button>
                </motion.div>

                {/* PRO TIER */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="group relative bg-gradient-to-br from-bg-card/60 to-primary/5 backdrop-blur-2xl border border-primary/30 rounded-[2.5rem] p-10 hover:border-primary/50 transition-all duration-700 hover:shadow-[0_40px_80px_-20px_rgba(212,80,10,0.2)] overflow-hidden"
                >
                    {/* Best Value badge */}
                    {plan.badge && (
                        <div className="absolute top-6 right-6 px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg animate-pulse">
                            {plan.badge}
                        </div>
                    )}

                    {/* Glow effect */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/20 transition-colors duration-700" />

                    <div className="relative z-10">
                        <div className="mb-8">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                                    <Icon icon="solar:fire-bold-duotone" className="w-5 h-5 text-primary" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">Saffron Pro</span>
                            </div>
                            <h3 className="text-3xl font-black tracking-tight mb-1">Pro Player</h3>
                            <p className="text-text-muted text-sm font-medium">Season Pass unlocked. 🎮</p>
                        </div>

                        <div className="mb-8 flex items-end gap-2">
                            {plan.originalPrice && (
                                <span className="text-2xl font-black text-text-muted/30 line-through">₹{plan.originalPrice}</span>
                            )}
                            <span className="text-5xl font-black tracking-tighter text-primary">₹{plan.price}</span>
                            <span className="text-sm font-bold text-text-muted mb-1">/ {plan.period}</span>
                        </div>

                        <ul className="space-y-4 mb-10">
                            {PRO_FEATURES.map((f, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <Icon icon={f.icon} className="w-5 h-5 text-primary/70 mt-0.5 shrink-0" />
                                    <div>
                                        <span className="text-sm font-bold text-text-primary">{f.text}</span>
                                        <span className="block text-[10px] font-bold text-primary/30 italic">"{f.vibe}"</span>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-[#FF8C42] text-white font-black text-sm uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(212,80,10,0.4)] hover:shadow-[0_25px_50px_-10px_rgba(212,80,10,0.6)] transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-3">
                            <Icon icon="solar:lock-keyhole-unlocked-bold" className="w-5 h-5" />
                            Unlock Pro
                        </button>

                        {/* OCR Top-up pill */}
                        <div className="mt-6 text-center text-[10px] font-black text-text-muted/40 uppercase tracking-widest">
                            Need more scans? <span className="text-primary/60">₹49 for 50 scans</span> — <span className="italic">Ammo Pack</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Referral CTA */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-16 text-center"
            >
                <div className="inline-flex items-center gap-3 px-8 py-4 bg-bg-card/40 backdrop-blur-2xl border border-border/60 rounded-2xl">
                    <Icon icon="solar:users-group-rounded-bold-duotone" className="w-6 h-6 text-primary" />
                    <div className="text-left">
                        <p className="text-sm font-black text-text-primary">Refer a friend → Both get 1 month Pro free</p>
                        <p className="text-[10px] font-bold text-text-muted/50">Refer 10 friends, get 1 full year Pro free 🎉</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
