'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCalcFlow, ModeType } from '@/context/CalcFlowContext';
import { useUser } from '@/context/UserContext';
import { FiBookOpen, FiLayers, FiArrowLeft } from 'react-icons/fi';

export default function WhatPage() {
    const router = useRouter();
    const { setMode } = useCalcFlow();
    const { isDemoGPA } = useUser();

    const handleSelect = (mode: ModeType) => {
        setMode(mode);
        router.push('/calculate/how');
    };

    const options = [
        {
            mode: 'single_sem' as ModeType,
            label: 'Single Semester GPA',
            sublabel: 'Calculate the GPA for one semester only. Perfect for a quick check or your most recent results.',
            tag: 'Quick Check',
            icon: <FiBookOpen className="w-7 h-7" />,
            accentColor: 'text-primary',
            borderHover: 'hover:border-primary/40',
            bgHover: 'hover:bg-primary/5',
            glowColor: 'bg-primary/10',
            tagColor: 'bg-primary/10 text-primary border-primary/20',
        },
        {
            mode: 'multi_sem' as ModeType,
            label: 'Overall CGPA',
            sublabel: 'Upload all marksheets and calculate your cumulative GPA, arrear history, and degree class across all semesters.',
            tag: 'Full Analysis',
            icon: <FiLayers className="w-7 h-7" />,
            accentColor: 'text-accent-1',
            borderHover: 'hover:border-accent-1/40',
            bgHover: 'hover:bg-accent-1/5',
            glowColor: 'bg-accent-1/10',
            tagColor: 'bg-accent-1/10 text-accent-1 border-accent-1/20',
        },
    ].filter(opt => !isDemoGPA || opt.mode === 'single_sem');

    return (
        <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-text-primary relative overflow-hidden">

            {/* Atmospheric glows */}
            <div className="absolute top-[30%] right-[-10%] w-[45%] h-[45%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-0 left-[-10%] w-[35%] h-[35%] bg-accent-1/5 rounded-full blur-[120px] pointer-events-none" />

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
                                className={`h-1 rounded-full transition-all duration-300 ${s === 2 ? 'w-8 bg-primary' : s < 2 ? 'w-4 bg-primary/40' : 'w-4 bg-border'}`}
                            />
                        ))}
                    </div>
                    <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Step 2 of 3</span>
                </div>

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">What are we doing?</h1>
                    <p className="text-text-muted font-medium text-lg">Choose what you want to calculate today.</p>
                </div>

                {/* Option cards */}
                <div className="flex flex-col gap-5 mb-8">
                    {options.map((opt, i) => (
                        <motion.button
                            key={opt.mode}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            onClick={() => handleSelect(opt.mode)}
                            className={`group relative p-8 rounded-[2rem] border border-border bg-bg-card ${opt.borderHover} ${opt.bgHover} transition-all duration-300 text-left flex items-start gap-6 shadow-sm hover:shadow-xl overflow-hidden`}
                        >
                            {/* Hover glow */}
                            <div className={`absolute top-0 right-0 w-36 h-36 ${opt.glowColor} rounded-full blur-[60px] opacity-0 group-hover:opacity-70 transition-opacity duration-500 pointer-events-none`} />

                            {/* Icon */}
                            <div className={`relative z-10 shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center border border-border bg-bg-card-alt ${opt.accentColor} group-hover:scale-110 group-hover:${opt.glowColor} transition-all duration-300`}>
                                {opt.icon}
                            </div>

                            {/* Text */}
                            <div className="relative z-10 flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className={`text-xl font-black group-hover:${opt.accentColor} transition-colors`}>{opt.label}</h3>
                                    <span className={`text-[0.65rem] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${opt.tagColor}`}>
                                        {opt.tag}
                                    </span>
                                </div>
                                <p className="text-sm text-text-muted font-medium leading-relaxed">{opt.sublabel}</p>
                            </div>

                            {/* Arrow indicator */}
                            <div className={`relative z-10 self-center shrink-0 ${opt.accentColor} opacity-0 group-hover:opacity-100 translate-x-[-8px] group-hover:translate-x-0 transition-all duration-300`}>
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
