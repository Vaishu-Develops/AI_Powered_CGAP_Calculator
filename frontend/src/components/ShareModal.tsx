'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@iconify/react';
import { useUser } from '@/context/UserContext';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    gpa: number;
    cgpa?: number;
    semester?: number;
    topGrade?: string;
    className_?: string;
}

export default function ShareModal({ isOpen, onClose, gpa, cgpa, semester, topGrade, className_ }: ShareModalProps) {
    const { user } = useUser();
    const [tab, setTab] = useState<'quick' | 'wrapped'>('quick');
    const [copied, setCopied] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const wrappedRef = useRef<HTMLDivElement>(null);

    const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://cgpaintel.com';
    const shareText = `🔥 I just got my ${semester ? `Sem ${semester} ` : ''}GPA: ${gpa.toFixed(2)} ${cgpa ? `(CGPA: ${cgpa.toFixed(2)})` : ''} in 30 seconds using CGPA Intel! Try it → ${shareUrl}`;

    const handleWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadWrapped = async () => {
        if (!wrappedRef.current) return;
        setDownloading(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(wrappedRef.current, {
                backgroundColor: null,
                scale: 2,
                logging: false,
                useCORS: true,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('wrapped-card-capture');
                    if (el) {
                        el.style.borderRadius = '24px';
                    }
                }
            });
            const link = document.createElement('a');
            link.download = `cgpa-intel-sem${semester || ''}-wrapped.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error('Failed to generate image:', e);
        }
        setDownloading(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-bg-card border border-border/60 rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-8 pt-6 pb-6 bg-primary rounded-t-[2rem]">
                        <h3 className="text-xl font-black tracking-tight text-white m-0">Celebrate Your Achievement</h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors border border-white/20">
                            <Icon icon="solar:close-circle-bold" className="w-5 h-5 text-white" />
                        </button>
                    </div>

                    {/* Tab Toggle */}
                    <div className="px-8 mt-6 mb-6">
                        <div className="flex bg-bg-card-alt rounded-2xl p-1.5 border border-border/40 shadow-inner">
                            <button
                                onClick={() => setTab('quick')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${tab === 'quick' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:bg-primary hover:text-white hover:shadow-md active:scale-95'}`}
                            >
                                <Icon icon="solar:plain-2-bold-duotone" className="w-4 h-4" />
                                Quick Message
                            </button>
                            <button
                                onClick={() => setTab('wrapped')}
                                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 relative ${tab === 'wrapped' ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:bg-primary hover:text-white hover:shadow-md active:scale-95'}`}
                            >
                                <Icon icon="solar:camera-square-bold-duotone" className="w-4 h-4" />
                                Visual Recap
                                {!user?.is_pro && <Icon icon="solar:lock-bold" className="w-3 h-3 text-white/60 ml-0.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-8 pb-8">
                        {tab === 'quick' ? (
                            <div className="space-y-4">
                                {/* Preview */}
                                <div className="bg-bg-card-alt rounded-2xl p-4 text-sm text-text-muted font-medium border border-border/30">
                                    {shareText}
                                </div>

                                {/* WhatsApp */}
                                <button
                                    onClick={handleWhatsApp}
                                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#25D366] text-white font-black text-sm uppercase tracking-widest hover:-translate-y-0.5 transition-all shadow-lg"
                                >
                                    <Icon icon="logos:whatsapp-icon" className="w-5 h-5" />
                                    Share on WhatsApp
                                </button>

                                {/* Copy Link */}
                                <button
                                    onClick={handleCopy}
                                    className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl border border-border/60 text-text-primary font-black text-sm uppercase tracking-widest hover:border-primary/30 hover:text-primary transition-all"
                                >
                                    <Icon icon={copied ? 'solar:check-circle-bold' : 'solar:copy-bold-duotone'} className="w-5 h-5" />
                                    {copied ? 'Copied!' : 'Copy Text'}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {!user?.is_pro ? (
                                    <div className="space-y-6 pt-4 pb-2">
                                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
                                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                                <Icon icon="solar:star-fall-bold-duotone" className="w-8 h-8 text-primary" />
                                            </div>
                                            <h4 className="text-lg font-black text-text-primary mb-2">Saffron Pro Feature</h4>
                                            <p className="text-sm text-text-muted font-medium mb-6">
                                                Upgrade to Pro to unlock stunning **Visual Recap Cards** and share your academic progress in style!
                                            </p>
                                            <div className="flex flex-col gap-3">
                                                <button
                                                    onClick={() => {
                                                        onClose();
                                                        const el = document.getElementById('pricing-section');
                                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                                    }}
                                                    className="w-full py-3.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                >
                                                    Upgrade to Pro
                                                </button>
                                                <button
                                                    onClick={() => setTab('quick')}
                                                    className="w-full py-3.5 bg-bg-card-alt text-text-muted rounded-xl font-black text-xs uppercase tracking-widest border border-border/40 hover:text-primary transition-all"
                                                >
                                                    Back to Quick Message
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {/* Wrapped Card Preview */}
                                        <div
                                            ref={wrappedRef}
                                            id="wrapped-card-capture"
                                            className="relative rounded-2xl overflow-hidden bg-[#0A0A0A] p-8"
                                            style={{ aspectRatio: '9/16', maxHeight: '420px' }}
                                        >
                                            <div
                                                className="absolute inset-0 pointer-events-none"
                                                style={{
                                                    background: 'linear-gradient(180deg, rgba(212, 80, 10, 0.4) 0%, #0A0A0A 60%, rgba(212, 80, 10, 0.2) 100%)'
                                                }}
                                            />
                                            <div
                                                className="absolute bottom-0 left-0 w-full h-1/3 pointer-events-none"
                                                style={{
                                                    background: 'linear-gradient(to top, rgba(10, 10, 10, 1), transparent)'
                                                }}
                                            />
                                            <div className="relative z-10 flex flex-col justify-between h-full">
                                                <div>
                                                    <div className="text-[9px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: 'rgba(212, 80, 10, 0.6)' }}>CGPA Intel</div>
                                                    <div className="text-[10px] font-bold" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Semester {semester || '?'} Recap</div>
                                                </div>
                                                <div className="flex flex-col items-center justify-center py-6 w-full gap-1">
                                                    {cgpa && cgpa > 0 ? (
                                                        <>
                                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] w-full text-center" style={{ color: 'rgba(212, 80, 10, 0.5)' }}>Overall CGPA</div>
                                                            <div className="text-7xl font-black text-white tracking-tight leading-tight mb-2 text-center w-full">{cgpa.toFixed(2)}</div>
                                                            <div className="text-[11px] font-bold text-center w-full" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Semester GPA: {gpa.toFixed(2)}</div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="text-[10px] font-black uppercase tracking-[0.2em] w-full text-center" style={{ color: 'rgba(212, 80, 10, 0.5)' }}>Semester GPA</div>
                                                            <div className="text-7xl font-black text-white tracking-tight leading-tight text-center w-full">{gpa.toFixed(2)}</div>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="space-y-3">
                                                    {topGrade && (
                                                        <div className="flex items-center justify-between rounded-xl px-4 py-2.5 border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Top Grade</span>
                                                            <span className="text-sm font-black text-[#51A880]">{topGrade}</span>
                                                        </div>
                                                    )}
                                                    {className_ && (
                                                        <div className="flex items-center justify-between rounded-xl px-4 py-2.5 border" style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255, 255, 255, 0.3)' }}>Class</span>
                                                            <span className="text-sm font-black text-[#D4500A]">{className_}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-center mt-4">
                                                    <div className="text-[8px] font-black uppercase tracking-[0.3em]" style={{ color: 'rgba(255, 255, 255, 0.15)' }}>
                                                        cgpaintel.com
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleDownloadWrapped}
                                            disabled={downloading}
                                            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-primary to-[#FF8C42] text-white font-black text-sm uppercase tracking-widest hover:-translate-y-0.5 transition-all shadow-lg disabled:opacity-50"
                                        >
                                            <Icon icon={downloading ? 'solar:loading-bold' : 'solar:download-minimalistic-bold'} className={`w-5 h-5 ${downloading ? 'animate-spin' : ''}`} />
                                            {downloading ? 'Generating...' : 'Download & Share'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

