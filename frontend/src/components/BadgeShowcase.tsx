'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';

interface Badge {
    id: string;
    emoji: string;
    name: string;
    vibe: string;
    description: string;
    color: string;
    check: () => boolean;
}

const BADGES: Badge[] = [
    {
        id: 'first_blood',
        emoji: '🐣',
        name: 'First Blood',
        vibe: 'The journey begins',
        description: 'Complete your first GPA calculation',
        color: '#F26522',
        check: () => localStorage.getItem('saffron_badge_first_blood') === 'true',
    },
    {
        id: 'on_fire',
        emoji: '🔥',
        name: 'On Fire',
        vibe: '2-semester streak',
        description: 'Calculate 2 semesters',
        color: '#FF6B35',
        check: () => {
            const count = parseInt(localStorage.getItem('saffron_semesters_calculated') || '0');
            return count >= 2;
        },
    },
    {
        id: 'sniper',
        emoji: '🎯',
        name: 'Sniper',
        vibe: 'Hit your target',
        description: 'Use the What-If Simulator',
        color: '#7C3AED',
        check: () => localStorage.getItem('saffron_badge_sniper') === 'true',
    },
    {
        id: 'duo_partner',
        emoji: '👥',
        name: 'Duo Partner',
        vibe: 'Carry your teammate',
        description: 'Calculate a friend\'s GPA',
        color: '#3B82F6',
        check: () => localStorage.getItem('saffron_badge_duo') === 'true',
    },
    {
        id: 'scanner_pro',
        emoji: '📸',
        name: 'Scanner Pro',
        vibe: 'AI-powered loot',
        description: 'Use AI OCR for the first time',
        color: '#06B6D4',
        check: () => localStorage.getItem('saffron_badge_scanner') === 'true',
    },
    {
        id: 'half_time_hero',
        emoji: '🏅',
        name: 'Half-Time Hero',
        vibe: '4-semester veteran',
        description: 'Calculate 4 semesters',
        color: '#F59E0B',
        check: () => {
            const count = parseInt(localStorage.getItem('saffron_semesters_calculated') || '0');
            return count >= 4;
        },
    },
    {
        id: 'diamond_hands',
        emoji: '💎',
        name: 'Diamond Hands',
        vibe: 'Consistent excellence',
        description: 'Maintain 8.5+ CGPA for 3 semesters',
        color: '#8B5CF6',
        check: () => localStorage.getItem('saffron_badge_diamond') === 'true',
    },
    {
        id: 'graduation_legend',
        emoji: '🎓',
        name: 'Graduation Legend',
        vibe: 'The full journey',
        description: 'Complete all 8 semesters',
        color: '#10B981',
        check: () => {
            const count = parseInt(localStorage.getItem('saffron_semesters_calculated') || '0');
            return count >= 8;
        },
    },
    {
        id: 'squad_leader',
        emoji: '🫂',
        name: 'Squad Leader',
        vibe: 'Building the army',
        description: 'Refer 3 friends',
        color: '#EC4899',
        check: () => {
            const refs = parseInt(localStorage.getItem('saffron_referrals') || '0');
            return refs >= 3;
        },
    },
    {
        id: 'og',
        emoji: '👑',
        name: 'OG',
        vibe: 'Day one legend',
        description: 'Sign up during launch period',
        color: '#EAB308',
        check: () => localStorage.getItem('saffron_badge_og') === 'true',
    },
];

import { useUser } from '@/context/UserContext';

export default function BadgeShowcase({ onViewFull, reports = [] }: { onViewFull?: () => void, reports?: any[] }) {
    const { user } = useUser();
    const isPro = user?.is_pro || false;

    const unlockedBadges = useMemo(() => {
        const set = new Set<string>();

        // 1. Load from Context (Direct Badge Flags from Backend)
        if (user?.badges) {
            user.badges.forEach(id => set.add(id));
        }

        // 2. Logic-based unlocking (Database Reports)
        // If user has many reports in DB, they deserve these badges!
        const reportCount = reports.length;
        if (reportCount >= 1) set.add('first_blood');
        if (reportCount >= 2) set.add('on_fire');
        if (reportCount >= 4) set.add('half_time_hero');
        if (reportCount >= 8) set.add('graduation_legend');

        // 3. Fallback to LocalStorage (For Guests or side-effects)
        if (typeof window !== 'undefined') {
            BADGES.forEach(b => {
                if (set.has(b.id)) return;
                try { if (b.check()) set.add(b.id); } catch { /* noop */ }
            });
        }
        return set;
    }, [user?.badges, reports.length]);

    const unlockedCount = unlockedBadges.size;

    return (
        <div className="mt-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Icon icon="solar:medal-ribbons-star-bold-duotone" className="w-6 h-6 text-primary" />
                    <h3 className="text-lg font-black tracking-tight">Achievements</h3>
                </div>
                <span className="text-xs font-black text-text-muted/40 uppercase tracking-widest">
                    {unlockedCount}/{BADGES.length} unlocked
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-border/30 rounded-full overflow-hidden mb-8">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(unlockedCount / BADGES.length) * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-primary to-accent-1 rounded-full"
                />
            </div>

            {/* Badge Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {BADGES.map((badge, i) => {
                    const unlocked = unlockedBadges.has(badge.id);
                    return (
                        <motion.div
                            key={badge.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            className={`relative flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-500 ${unlocked
                                ? 'bg-bg-card/60 border-primary/20 hover:border-primary/40 hover:shadow-lg'
                                : 'bg-bg-card-alt/30 border-border/20 opacity-50'
                                }`}
                        >
                            {/* Lock overlay */}
                            {!unlocked && (
                                <div className="absolute top-2 right-2">
                                    <Icon icon="solar:lock-bold" className="w-3 h-3 text-text-muted/30" />
                                </div>
                            )}

                            <span className={`text-3xl mb-2 ${unlocked ? '' : 'grayscale'}`}>
                                {badge.emoji}
                            </span>
                            <span className="text-[10px] font-black text-text-primary tracking-tight leading-tight mb-0.5">
                                {badge.name}
                            </span>
                            <span className="text-[8px] font-bold text-text-muted/40 italic">
                                "{badge.vibe}"
                            </span>
                        </motion.div>
                    );
                })}
            </div>

            {/* View Full Stats CTA */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-10 flex justify-center"
            >
                <button
                    onClick={onViewFull}
                    className="flex items-center gap-3 px-8 py-4 bg-bg-card-alt border border-border rounded-2xl hover:border-primary/40 hover:bg-bg-card transition-all group"
                >
                    <Icon icon="solar:history-bold-duotone" className="w-5 h-5 text-primary" />
                    <div className="text-left">
                        <p className="text-xs font-black text-text-primary uppercase tracking-wider">View Full Evolution & Stats</p>
                        {!isPro ? (
                            <p className="text-[10px] font-bold text-text-muted/40 flex items-center gap-1 uppercase tracking-widest">
                                <Icon icon="solar:lock-bold" className="w-2.5 h-2.5" />
                                Unlocked via Saffron Pro
                            </p>
                        ) : (
                            <p className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-widest">
                                <Icon icon="solar:star-bold" className="w-2.5 h-2.5" />
                                Pro Access Active
                            </p>
                        )}
                    </div>
                    <Icon icon="solar:alt-arrow-right-bold-duotone" className="w-5 h-5 text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
            </motion.div>
        </div>
    );
}
