'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCalcFlow, InputMethodType } from '@/context/CalcFlowContext';

export default function HowPage() {
    const router = useRouter();
    const { setInputMethod, state } = useCalcFlow();

    const handleSelect = (method: InputMethodType) => {
        setInputMethod(method);
        router.push('/calculate/input');
    };

    return (
        <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-text-primary relative overflow-hidden">

            {/* Aurora */}
            <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] bg-accent-2/5 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                className="max-w-xl w-full"
            >
                <div className="mb-8 text-center">
                    <p className="text-accent-2 font-black tracking-widest uppercase text-sm mb-2">Step 3 of 3</p>
                    <h1 className="text-4xl font-black tracking-tight mb-2">How do you want to input?</h1>
                    <p className="text-text-muted font-medium">Upload a screenshot or type grades manually.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

                    <button
                        onClick={() => handleSelect('ocr')}
                        className="p-6 rounded-[24px] border border-border bg-gradient-to-br from-bg-card to-bg-card hover:border-primary/50 transition-all text-left flex flex-col items-center text-center group shadow-md shadow-black/5"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">📸</div>
                        <h3 className="text-xl font-bold mb-2">Auto-Extract (OCR)</h3>
                        <p className="text-sm text-text-muted">Upload marksheet screenshots. Our AI does the rest instantly.</p>
                    </button>

                    <button
                        onClick={() => handleSelect('manual')}
                        className="p-6 rounded-[24px] border border-border bg-gradient-to-br from-bg-card to-bg-card hover:border-accent-2/50 transition-all text-left flex flex-col items-center text-center group shadow-md shadow-black/5"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-accent-2/10 flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">⌨️</div>
                        <h3 className="text-xl font-bold mb-2">Manual Entry</h3>
                        <p className="text-sm text-text-muted">Use a fast, keyboard-friendly grid to type in your subjects and grades.</p>
                    </button>

                </div>

                <div className="flex justify-between items-center mt-8 pt-6 border-t border-border/50">
                    <button onClick={() => router.back()} className="px-6 py-3 font-bold text-text-muted hover:text-text-primary">{'<-'} Back</button>
                </div>

            </motion.div>
        </main>
    );
}
