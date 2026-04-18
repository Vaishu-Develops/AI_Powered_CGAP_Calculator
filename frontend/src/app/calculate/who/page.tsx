'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCalcFlow, TargetType } from '@/context/CalcFlowContext';
import { FiUser, FiUsers, FiArrowRight, FiArrowLeft } from 'react-icons/fi';

export default function WhoPage() {
    const router = useRouter();
    const { state, setTarget, setSource, setPreselectedSemester } = useCalcFlow();
    const [selected, setSelected] = useState<TargetType | null>(state.target || null);
    const [friendName, setFriendName] = useState('');

    const handleNext = () => {
        if (!selected) return;
        if (selected === 'friend' && !friendName.trim()) return;
        setSource(selected === 'friend' ? 'friend_mode' : 'fresh');
        setPreselectedSemester(null);
        setTarget(selected, friendName);
        router.push('/calculate/what');
    };

    const options: {
        id: TargetType;
        label: string;
        sublabel: string;
        icon: React.ReactNode;
        accentClass: string;
        borderActive: string;
        bgActive: string;
        shadowActive: string;
        glowClass: string;
    }[] = [
            {
                id: 'me',
                label: 'For Me',
                sublabel: 'Calculate and save to my personal dashboard.',
                icon: <FiUser className="w-7 h-7" />,
                accentClass: 'text-primary',
                borderActive: 'border-primary',
                bgActive: 'bg-primary/5',
                shadowActive: 'shadow-primary/15',
                glowClass: 'bg-primary/10',
            },
            {
                id: 'friend',
                label: 'For a Friend',
                sublabel: 'Generate a guest report without saving to my profile.',
                icon: <FiUsers className="w-7 h-7" />,
                accentClass: 'text-accent-1',
                borderActive: 'border-accent-1',
                bgActive: 'bg-accent-1/5',
                shadowActive: 'shadow-accent-1/15',
                glowClass: 'bg-accent-1/10',
            },
        ];

    const isValid = selected && (selected === 'me' || friendName.trim());

    return (
        <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-text-primary relative overflow-hidden">

            {/* Atmospheric glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-1/5 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="max-w-lg w-full"
            >
                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-10">
                    <div className="flex gap-1.5">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={`h-1 rounded-full transition-all duration-300 ${s === 1 ? 'w-8 bg-primary' : 'w-4 bg-border'}`}
                            />
                        ))}
                    </div>
                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Step 1 of 3</span>
                </div>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">Who is this for?</h1>
                    <p className="text-text-muted font-medium text-lg">Select whose CGPA you are calculating today.</p>
                </div>

                {state.source === 'friend_mode' && (
                    <div className="mb-8 border border-accent-1/30 bg-accent-1/10 rounded-2xl p-4">
                        <p className="text-sm font-bold text-accent-1">Guest mode from your dashboard</p>
                        <p className="text-sm text-text-muted font-medium mt-1">This report will stay separate from your personal semester timeline.</p>
                    </div>
                )}

                {/* Selection cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
                    {options.map((opt) => {
                        const isSelected = selected === opt.id;
                        return (
                            <button
                                key={opt.id}
                                onClick={() => { setSelected(opt.id); setFriendName(''); }}
                                className={`relative group p-8 rounded-[2rem] border-2 text-left transition-all duration-300 overflow-hidden
                                    ${isSelected
                                        ? `${opt.borderActive} ${opt.bgActive} shadow-xl ${opt.shadowActive}`
                                        : 'border-border bg-bg-card hover:border-primary/30 hover:shadow-md'
                                    }`}
                            >
                                {/* Hover glow */}
                                <div className={`absolute top-0 right-0 w-32 h-32 ${opt.glowClass} rounded-full blur-[50px] opacity-0 ${isSelected ? 'opacity-100' : 'group-hover:opacity-50'} transition-opacity duration-500 pointer-events-none`} />

                                {/* Icon */}
                                <div className={`relative z-10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border transition-all duration-300
                                    ${isSelected
                                        ? `${opt.glowClass} border-${opt.id === 'me' ? 'primary' : 'accent-1'}/30 ${opt.accentClass}`
                                        : 'bg-bg-card-alt border-border text-text-muted group-hover:border-primary/20 group-hover:text-primary'
                                    }`}
                                >
                                    {opt.icon}
                                </div>

                                {/* Text */}
                                <div className="relative z-10">
                                    <h3 className={`text-xl font-black mb-1.5 transition-colors ${isSelected ? opt.accentClass : 'text-text-primary'}`}>
                                        {opt.label}
                                    </h3>
                                    <p className="text-sm text-text-muted font-medium leading-relaxed">{opt.sublabel}</p>
                                </div>

                                {/* Selected checkmark */}
                                {isSelected && (
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center ${opt.accentClass} ${opt.glowClass} border ${opt.id === 'me' ? 'border-primary/30' : 'border-accent-1/30'}`}
                                    >
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </motion.div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Friend name input */}
                <AnimatePresence>
                    {selected === 'friend' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-8 overflow-hidden"
                        >
                            <label className="block text-sm font-bold text-text-muted mb-2 ml-1">
                                Friend&apos;s Name or Register Number
                            </label>
                            <input
                                type="text"
                                value={friendName}
                                onChange={(e) => setFriendName(e.target.value)}
                                placeholder="e.g., John Doe or 712521104001"
                                className="w-full bg-bg-card border border-border px-5 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent-1/40 focus:border-accent-1/50 font-medium text-text-primary placeholder:text-text-muted/50 transition-all"
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Footer actions */}
                <div className="flex items-center justify-between pt-6 border-t border-border/50">
                    <button
                        onClick={() => router.push('/home')}
                        className="flex items-center gap-2 px-5 py-3 font-bold text-text-muted hover:text-text-primary transition-colors"
                    >
                        <FiArrowLeft className="w-4 h-4" />
                        Back
                    </button>

                    <motion.button
                        onClick={handleNext}
                        disabled={!isValid}
                        animate={isValid ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className={`flex items-center gap-3 px-8 py-3.5 rounded-full font-bold text-lg transition-all
                            ${isValid
                                ? 'bg-primary text-white shadow-lg shadow-primary/25 hover:scale-105 hover:shadow-primary/40 active:scale-95'
                                : 'pointer-events-none opacity-0'
                            }`}
                    >
                        Continue
                        <FiArrowRight className="w-5 h-5" />
                    </motion.button>
                </div>
            </motion.div>
        </main>
    );
}
