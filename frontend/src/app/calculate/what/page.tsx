'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCalcFlow, ModeType } from '@/context/CalcFlowContext';

export default function WhatPage() {
    const router = useRouter();
    const { setMode } = useCalcFlow();

    const handleSelect = (mode: ModeType) => {
        setMode(mode);
        router.push('/calculate/how');
    };

    return (
        <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-text-primary relative overflow-hidden">

            {/* Aurora */}
            <div className="absolute top-[40%] right-[-10%] w-[50%] h-[50%] bg-success/5 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="max-w-xl w-full"
            >
                <div className="mb-8 text-center">
                    <p className="text-success font-black tracking-widest uppercase text-sm mb-2">Step 2 of 3</p>
                    <h1 className="text-4xl font-black tracking-tight mb-2">What are we doing?</h1>
                    <p className="text-text-muted font-medium">Choose what you want to calculate today.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-8">

                    <button
                        onClick={() => handleSelect('single_sem')}
                        className="p-6 rounded-[24px] border border-border bg-bg-card hover:border-success/50 hover:bg-success/5 transition-all text-left flex items-start gap-4 group shadow-sm shadow-black/5"
                    >
                        <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-xl text-success group-hover:scale-110 transition-transform">📄</div>
                        <div>
                            <h3 className="text-xl font-bold mb-1">Single Semester GPA</h3>
                            <p className="text-sm text-text-muted">Calculate the GPA for just one semester. Perfect for quick checks.</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleSelect('multi_sem')}
                        className="p-6 rounded-[24px] border border-border bg-bg-card hover:border-data/50 hover:bg-data/5 transition-all text-left flex items-start gap-4 group shadow-sm shadow-black/5"
                    >
                        <div className="w-12 h-12 rounded-xl bg-data/10 flex items-center justify-center text-xl text-data group-hover:scale-110 transition-transform">📚</div>
                        <div>
                            <h3 className="text-xl font-bold mb-1">Overall CGPA (Multiple Semesters)</h3>
                            <p className="text-sm text-text-muted">Upload all your marksheets to calculate your cumulative GPA, arrear history, and class data.</p>
                        </div>
                    </button>

                </div>

                <div className="flex justify-between items-center mt-8 pt-6 border-t border-border/50">
                    <button onClick={() => router.back()} className="px-6 py-3 font-bold text-text-muted hover:text-text-primary">{'<-'} Back</button>
                </div>

            </motion.div>
        </main>
    );
}
