'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCalcFlow, TargetType } from '@/context/CalcFlowContext';

export default function WhoPage() {
    const router = useRouter();
    const { setTarget } = useCalcFlow();
    const [selected, setSelected] = useState<TargetType | null>(null);
    const [friendName, setFriendName] = useState('');

    const handleNext = () => {
        if (!selected) return;
        if (selected === 'friend' && !friendName.trim()) return;

        setTarget(selected, friendName);
        router.push('/calculate/what');
    };

    return (
        <main className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-text-primary relative overflow-hidden">

            {/* Aurora */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="max-w-xl w-full"
            >
                <div className="mb-8 text-center">
                    <p className="text-primary font-black tracking-widest uppercase text-sm mb-2">Step 1 of 3</p>
                    <h1 className="text-4xl font-black tracking-tight mb-2">Who is this for?</h1>
                    <p className="text-text-muted font-medium">Select whose CGPA you are calculating today.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">

                    <button
                        onClick={() => { setSelected('me'); setFriendName(''); }}
                        className={`p-6 rounded-[24px] border-2 text-left transition-all ${selected === 'me'
                                ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                                : 'border-border bg-bg-card hover:border-primary/50'
                            }`}
                    >
                        <div className="text-4xl mb-4">🙋‍♂️</div>
                        <h3 className="text-xl font-bold mb-1">For Me</h3>
                        <p className="text-sm text-text-muted">Calculate and save to my personal dashboard.</p>
                    </button>

                    <button
                        onClick={() => setSelected('friend')}
                        className={`p-6 rounded-[24px] border-2 text-left transition-all ${selected === 'friend'
                                ? 'border-accent-1 bg-accent-1/5 shadow-lg shadow-accent-1/10'
                                : 'border-border bg-bg-card hover:border-accent-1/50'
                            }`}
                    >
                        <div className="text-4xl mb-4">👾</div>
                        <h3 className="text-xl font-bold mb-1">For a Friend</h3>
                        <p className="text-sm text-text-muted">Calculate a guest report without saving to my main profile.</p>
                    </button>

                </div>

                {selected === 'friend' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        className="mb-8"
                    >
                        <label className="block text-sm font-bold text-text-muted mb-2 ml-2">Friend's Name / ID</label>
                        <input
                            type="text"
                            value={friendName}
                            onChange={(e) => setFriendName(e.target.value)}
                            placeholder="e.g., John Doe or 712521104001"
                            className="w-full bg-bg-card-alt border border-border/50 px-5 py-4 rounded-full focus:outline-none focus:ring-2 focus:ring-accent-1/50 font-medium"
                        />
                    </motion.div>
                )}

                <div className="flex justify-between items-center mt-12 pt-6 border-t border-border/50">
                    <button onClick={() => router.push('/home')} className="px-6 py-3 font-bold text-text-muted hover:text-text-primary">Cancel</button>

                    <button
                        onClick={handleNext}
                        disabled={!selected || (selected === 'friend' && !friendName.trim())}
                        className={`px-8 py-3 rounded-full font-bold text-lg transition-all ${selected && (selected === 'me' || friendName.trim())
                                ? 'bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105'
                                : 'bg-bg-card-alt text-text-muted cursor-not-allowed hidden' // hidden until valid for slicker UI
                            }`}
                    >
                        Continue -{'>'}
                    </button>
                </div>

            </motion.div>
        </main>
    );
}
