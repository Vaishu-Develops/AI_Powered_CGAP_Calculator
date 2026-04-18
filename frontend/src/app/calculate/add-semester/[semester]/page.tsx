'use client';

import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowLeft, FiCamera, FiEdit3 } from 'react-icons/fi';
import { useCalcFlow, InputMethodType } from '@/context/CalcFlowContext';

export default function AddSemesterPage() {
    const router = useRouter();
    const params = useParams<{ semester: string }>();
    const semester = Number(params?.semester || 1);
    const safeSemester = Number.isFinite(semester) && semester >= 1 && semester <= 8 ? semester : 1;
    const { setInputMethod, startQuickAddFromHome } = useCalcFlow();

    const handleSelect = (method: InputMethodType) => {
        startQuickAddFromHome(safeSemester);
        setInputMethod(method);
        router.push('/calculate/input');
    };

    return (
        <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-text-primary relative overflow-hidden">
            <div className="absolute top-[-8%] left-[-10%] w-[45%] h-[45%] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-accent-1/5 rounded-full blur-[110px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="max-w-xl w-full"
            >
                <div className="mb-8">
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-primary">Quick Add</span>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter mt-2 mb-3">Add Semester {safeSemester}</h1>
                    <p className="text-text-muted text-lg font-medium">
                        Context is already set to your dashboard. Choose how you want to add this semester.
                    </p>
                </div>

                <div className="space-y-4">
                    <button
                        onClick={() => handleSelect('ocr')}
                        className="w-full p-7 rounded-[28px] bg-bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left flex items-start gap-5"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
                            <FiCamera className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">Upload Marksheet</h2>
                            <p className="text-sm text-text-muted font-medium mt-1">Recommended. AI extracts subjects and grades automatically.</p>
                        </div>
                    </button>

                    <button
                        onClick={() => handleSelect('manual')}
                        className="w-full p-7 rounded-[28px] bg-bg-card border border-border hover:border-accent-1/40 hover:bg-accent-1/5 transition-all text-left flex items-start gap-5"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-accent-1/10 text-accent-1 border border-accent-1/20 flex items-center justify-center">
                            <FiEdit3 className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black">Enter Manually</h2>
                            <p className="text-sm text-text-muted font-medium mt-1">Type subject codes, grades, and credits directly.</p>
                        </div>
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-border/50">
                    <button
                        onClick={() => router.push('/home')}
                        className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary font-bold"
                    >
                        <FiArrowLeft className="w-4 h-4" /> Back to Home
                    </button>
                </div>
            </motion.div>
        </main>
    );
}
