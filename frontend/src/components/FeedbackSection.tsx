import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useUser } from '@/context/UserContext';
import { API_BASE } from '@/config/api';

const REACTIONS = [
    { emoji: '😍', label: 'Love it', value: 5 },
    { emoji: '🙂', label: 'Good', value: 4 },
    { emoji: '😐', label: 'Okay', value: 3 },
    { emoji: '😕', label: 'Meh', value: 2 },
    { emoji: '😡', label: 'Hate it', value: 1 },
];

export default function FeedbackSection() {
    const { user } = useUser();
    const [selectedReaction, setSelectedReaction] = useState<number | null>(null);
    const [feedback, setFeedback] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (selectedReaction === null) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE}/feedback/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user?.db_id || null,
                    reaction: selectedReaction,
                    comment: feedback
                }),
            });

            if (!response.ok) throw new Error('Failed to submit feedback');

            setSubmitted(true);
        } catch (err: any) {
            console.error('Feedback submission error:', err);
            setError('Failed to send feedback. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div id="feedback" className="mb-24 md:mb-48 max-w-3xl mx-auto px-6 relative scroll-mt-24">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-accent-1/5 rounded-full blur-[100px] md:blur-[200px] -z-10 pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-bg-card/40 backdrop-blur-2xl border border-border/60 rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-16 text-center relative overflow-hidden"
            >
                {/* Decorative glow */}
                <div className="absolute -top-16 -right-16 w-32 md:w-40 h-32 md:h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                <AnimatePresence mode="wait">
                    {!submitted ? (
                        <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}>
                            <div className="flex items-center justify-center gap-2 mb-4">
                                <Icon icon="solar:chat-round-dots-bold-duotone" className="w-5 md:w-6 h-5 md:h-6 text-primary" />
                                <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">We Listen</span>
                            </div>
                            <h2 className="text-2xl md:text-4xl font-black mb-3 tracking-tight leading-tight">
                                How's your experience?
                            </h2>
                            <p className="text-text-muted font-medium text-xs md:text-sm mb-8 md:mb-10 opacity-80">
                                Your feedback helps us build a better product for students.
                            </p>

                            {/* Emoji Reactions */}
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 md:gap-6 mb-8 md:mb-10">
                                {REACTIONS.map((r) => (
                                    <button
                                        key={r.value}
                                        onClick={() => setSelectedReaction(r.value)}
                                        className={`flex flex-col items-center gap-2 p-2 md:p-3 rounded-2xl transition-all duration-300 ${selectedReaction === r.value
                                            ? 'bg-primary/15 border border-primary/30 scale-105 md:scale-110 shadow-lg'
                                            : 'bg-bg-card-alt/30 border border-transparent hover:border-border/60'
                                            } ${r.value === 1 && 'col-span-1 xs:col-span-1'} ${r.value === 2 && 'col-span-1'}`}
                                    >
                                        <span className="text-2xl md:text-4xl">{r.emoji}</span>
                                        <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest leading-none text-center ${selectedReaction === r.value ? 'text-primary' : 'text-text-muted/40'
                                            }`}>
                                            {r.label}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Text Input */}
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Tell us more (optional)..."
                                rows={3}
                                className="w-full bg-bg-card-alt/50 border border-border/50 rounded-2xl px-5 py-4 text-sm font-medium text-text-primary placeholder:text-text-muted/30 focus:outline-none focus:border-primary/30 resize-none mb-6 md:mb-8 transition-colors"
                            />

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={selectedReaction === null || isSubmitting}
                                className={`w-full md:w-auto px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 ${selectedReaction !== null
                                    ? 'bg-primary text-white shadow-[0_15px_30px_-5px_rgba(212,80,10,0.3)] hover:-translate-y-1 hover:shadow-[0_20px_40px_-5px_rgba(212,80,10,0.4)]'
                                    : 'bg-border/20 text-text-muted/30 cursor-not-allowed'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Icon icon="solar:spinner-bold-duotone" className="w-5 h-5 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    'Send Feedback'
                                )}
                            </button>

                            {error && (
                                <p className="mt-4 text-xs font-bold text-red-500/80 animate-pulse">{error}</p>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="thanks"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="py-8"
                        >
                            <div className="text-6xl mb-6">🎉</div>
                            <h3 className="text-2xl font-black mb-2 tracking-tight">Thanks for your feedback!</h3>
                            <p className="text-text-muted text-sm font-medium">
                                Your voice shapes the future of CGPA Intel.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
