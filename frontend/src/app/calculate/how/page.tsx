'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCalcFlow, InputMethodType } from '@/context/CalcFlowContext';
import { FiUploadCloud, FiEdit3, FiArrowLeft, FiZap, FiClock } from 'react-icons/fi';

export default function HowPage() {
    const router = useRouter();
    const { setInputMethod } = useCalcFlow();

    const handleSelect = (method: InputMethodType) => {
        setInputMethod(method);
        router.push('/calculate/input');
    };

    const options: {
        method: InputMethodType;
        label: string;
        sublabel: string;
        badge: string;
        badgeIcon: React.ReactNode;
        icon: React.ReactNode;
        accentColor: string;
        borderHover: string;
        bgGlow: string;
        badgeStyle: string;
        recommended?: boolean;
    }[] = [
            {
                method: 'ocr',
                label: 'Auto-Extract via AI',
                sublabel: 'Upload your marksheet screenshot. Our AI engine extracts every grade instantly — no typing needed.',
                badge: '',
                badgeIcon: null,
                icon: <FiUploadCloud className="w-8 h-8" />,
                accentColor: 'text-primary',
                borderHover: 'hover:border-primary/40',
                bgGlow: 'bg-primary/10',
                badgeStyle: '',
                recommended: true,
            },
            {
                method: 'manual',
                label: 'Manual Entry',
                sublabel: 'Use a fast, keyboard-friendly grid to type in subjects, credits, and grades directly.',
                badge: 'Full control',
                badgeIcon: <FiClock className="w-3 h-3" />,
                icon: <FiEdit3 className="w-8 h-8" />,
                accentColor: 'text-accent-1',
                borderHover: 'hover:border-accent-1/40',
                bgGlow: 'bg-accent-1/10',
                badgeStyle: 'bg-accent-1/10 text-accent-1 border-accent-1/20',
            },
        ];

    return (
        <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-text-primary relative overflow-hidden">

            {/* Atmospheric glows */}
            <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[-5%] right-[-5%] w-[30%] h-[30%] bg-accent-1/5 rounded-full blur-[100px] pointer-events-none" />

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
                                className={`h-1 rounded-full transition-all duration-300 ${s === 3 ? 'w-8 bg-primary' : 'w-4 bg-primary/40'
                                    }`}
                            />
                        ))}
                    </div>
                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Step 3 of 3</span>
                </div>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">How do you want to input?</h1>
                    <p className="text-text-muted font-medium text-lg">Upload a screenshot or type grades manually.</p>
                </div>

                {/* Option cards — vertical layout for better readability */}
                <div className="flex flex-col gap-5 mb-8">
                    {options.map((opt, i) => (
                        <motion.button
                            key={opt.method}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => handleSelect(opt.method)}
                            className={`group relative p-8 rounded-[2rem] border border-border bg-bg-card ${opt.borderHover} transition-all duration-300 text-left flex items-start gap-6 shadow-sm hover:shadow-xl overflow-hidden`}
                        >
                            {/* Recommended ribbon */}
                            {opt.recommended && (
                                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[0.65rem] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-primary text-white shadow-sm shadow-primary/20">
                                    <FiZap className="w-3 h-3" /> Recommended
                                </div>
                            )}

                            {/* Hover glow */}
                            <div className={`absolute top-0 right-0 w-44 h-44 ${opt.bgGlow} rounded-full blur-[70px] opacity-0 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none`} />

                            {/* Icon block */}
                            <div className={`relative z-10 shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center border border-border ${opt.bgGlow} ${opt.accentColor} group-hover:scale-110 transition-all duration-300`}>
                                {opt.icon}
                            </div>

                            {/* Content */}
                            <div className="relative z-10 flex-1 pt-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <h3 className={`text-xl font-black ${opt.accentColor}`}>{opt.label}</h3>
                                    {opt.badge && (
                                        <span className={`inline-flex items-center gap-1 text-[0.65rem] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${opt.badgeStyle}`}>
                                            {opt.badgeIcon} {opt.badge}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-text-muted font-medium leading-relaxed">{opt.sublabel}</p>
                            </div>

                            {/* Arrow */}
                            <div className={`relative z-10 self-center shrink-0 ${opt.accentColor} opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </motion.button>
                    ))}
                </div>

                {/* Footer */}
                <div className="flex items-center pt-6 border-t border-border/50">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-5 py-3 font-bold text-text-muted hover:text-text-primary transition-colors"
                    >
                        <FiArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                </div>

            </motion.div>
        </main>
    );
}
