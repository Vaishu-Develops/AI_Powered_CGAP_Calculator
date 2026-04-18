'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';

function isExamSeason(): boolean {
    const month = new Date().getMonth(); // 0-indexed
    // May (4), June (5), November (10), December (11)
    return [4, 5, 10, 11].includes(month);
}

export default function FlashSaleBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem('saffron_flash_dismissed');
        if (isExamSeason() && dismissed !== 'true') {
            setVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        setVisible(false);
        localStorage.setItem('saffron_flash_dismissed', 'true');
    };

    if (!visible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -60, opacity: 0 }}
                className="relative z-30 bg-gradient-to-r from-[#D4500A] via-[#FF8C42] to-[#D4500A] text-white overflow-hidden"
            >
                {/* Animated shine */}
                <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                />

                <div className="max-w-[1400px] mx-auto flex items-center justify-between px-6 py-3 relative">
                    <div className="flex items-center gap-4 flex-1">
                        <Icon icon="solar:fire-bold" className="w-5 h-5 animate-pulse" />
                        <p className="text-xs md:text-sm font-black uppercase tracking-wider">
                            Exam Season Sale: Pro for <span className="underline decoration-2">₹49</span> — 48 hours only
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="hidden md:block px-4 py-1.5 bg-white text-primary text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-white/90 transition-colors shadow-md">
                            Grab Deal
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                        >
                            <Icon icon="solar:close-circle-bold" className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
