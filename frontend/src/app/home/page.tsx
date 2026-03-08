'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import dynamic from 'next/dynamic';

const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), { ssr: false });

export default function HomePage() {
    const router = useRouter();
    const { user, isDemo, logout, startDemo } = useUser();

    // If they somehow got here without being logged in or in demo mode, kick them to auth
    // In a real app, this would be middleware.
    if (!user && !isDemo) {
        if (typeof window !== 'undefined') router.push('/auth');
        return null;
    }

    const handleStartCalc = () => {
        router.push('/calculate/who');
    };

    const displayName = user?.name || 'Guest Explorer';

    return (
        <main
            style={{
                minHeight: '100vh',
                background: 'var(--background)',
                position: 'relative',
                color: 'var(--color-text-primary)'
            }}
        >
            <ParticleBackground />

            {/* Saffron Glow Background */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                <div
                    className="animate-aurora"
                    style={{
                        position: 'absolute', top: '-15%', right: '-5%', width: '40%', height: '50%',
                        background: 'radial-gradient(circle, rgba(212,80,10,0.06) 0%, transparent 70%)',
                        borderRadius: '50%', filter: 'blur(80px)',
                    }}
                />
            </div>

            <div style={{ position: 'relative', zIndex: 10, maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem' }}>

                {/* Navbar */}
                <nav className="flex justify-between items-center py-6 mb-8 border-b border-border/50">
                    <div className="text-xl font-black tracking-tighter cursor-pointer" onClick={() => router.push('/')}>
                        <span className="text-gradient">CGPA</span> Intel
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary">
                                {displayName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold hidden sm:block">{displayName}</span>
                        </div>
                        {user ? (
                            <button onClick={() => { logout(); router.push('/'); }} className="text-sm font-bold text-text-muted hover:text-primary transition-colors">
                                Sign Out
                            </button>
                        ) : (
                            <button onClick={() => router.push('/auth')} className="text-sm font-bold text-primary border border-primary/30 px-4 py-1.5 rounded-full hover:bg-primary/10 transition-colors">
                                Save Progress
                            </button>
                        )}
                    </div>
                </nav>

                {/* Demo Warning Banner */}
                {isDemo && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="mb-8 p-4 bg-accent-1/10 border border-accent-1/30 rounded-2xl flex items-center justify-between shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🚧</span>
                            <div>
                                <h4 className="font-bold text-accent-1">Demo Mode Active</h4>
                                <p className="text-sm text-text-muted">You are in a 1-time calculation session. Your reports will not be saved.</p>
                            </div>
                        </div>
                        <button onClick={() => router.push('/auth')} className="px-4 py-2 bg-accent-1 text-white font-bold text-sm rounded-full hover:scale-105 transition-transform hidden sm:block">
                            Create Free Account
                        </button>
                    </motion.div>
                )}

                {/* Dashboard Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">

                    {/* Main Action Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
                        className="md:col-span-2 bg-gradient-to-br from-bg-card to-bg-card-alt p-10 rounded-[32px] border border-border shadow-xl shadow-black/5 flex flex-col justify-center items-start relative overflow-hidden group"
                    >
                        {/* Decorative background circle */}
                        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors duration-700" />

                        <h2 className="text-4xl font-black tracking-tight mb-2">Ready to crunch numbers?</h2>
                        <p className="text-lg text-text-muted font-medium mb-8 max-w-md">
                            Start a new session to extract grades via OCR or enter them manually.
                        </p>
                        <button
                            onClick={handleStartCalc}
                            className="px-8 py-4 bg-primary text-white font-bold text-xl rounded-full shadow-lg shadow-primary/30 hover:scale-105 hover:shadow-primary/40 transition-all flex items-center gap-3"
                        >
                            <span>+ Start Calculation</span>
                        </button>
                    </motion.div>

                    {/* Stats / Recent Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
                        className="bg-bg-card p-8 rounded-[32px] border border-border flex flex-col items-center justify-center text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-bg-card-alt border-4 border-border flex items-center justify-center mb-6">
                            <span className="text-3xl">📁</span>
                        </div>
                        <h3 className="text-xl font-bold mb-2">Saved Reports</h3>
                        {isDemo ? (
                            <p className="text-sm text-text-muted">Available for registered accounts.</p>
                        ) : (
                            <div>
                                <p className="text-4xl font-black text-data my-2">0</p>
                                <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Calculations</p>
                            </div>
                        )}
                    </motion.div>

                </div>

                {/* Quick Help / Info */}
                <div className="mt-12 text-center text-text-muted text-sm font-medium">
                    Need help? The OCR pipeline automatically handles <strong>R2021</strong> and <strong>R2017</strong> marksheets with Revaluation logic built-in.
                </div>

            </div>
        </main>
    );
}
